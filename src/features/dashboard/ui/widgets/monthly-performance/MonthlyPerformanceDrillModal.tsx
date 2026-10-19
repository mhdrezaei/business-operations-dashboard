import type { FinancialMetric, MonthlyPerformanceBreakdownItem, MonthlyPerformanceBreakdownResponse } from "#src/features/dashboard/api/dashboard.dto";
import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatRial } from "#src/features/dashboard/model/format";
import { jalaliMonthLabel } from "#src/features/dashboard/model/jalali";
import { prefersReducedMotion } from "#src/features/dashboard/model/navigation";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { colorAt, useChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import { RiArrowDownLine, RiArrowUpLine, RiExpandUpDownLine, RiWallet3Line } from "#src/features/dashboard/ui/icons";
import { DashboardModal } from "#src/features/dashboard/ui/modal/DashboardModal";
import { WidgetError, WidgetSpinnerBox } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/** Clicked point of the line chart plus the server ordering of its rows. */
export interface DrillState {
	serviceId: number
	serviceCode: string
	serviceName: string | null
	/** Company-type series (e.g. traffic – CP): only rows of that type. Empty for a total series. */
	companyType: string | null
	year: number
	month: number
	/** `company_name|income|expense|profit`, `-` prefix = descending. */
	ordering: string
	/** Column the bar length follows; sorting by name keeps the last numeric column. */
	barKey: FinancialMetric
}

type DrillColumn = "company_name" | FinancialMetric;

const DRILL_COLS: DrillColumn[] = ["company_name", "income", "expense", "profit"];
const GRID = "grid grid-cols-[minmax(160px,2fr)_1fr_1fr_1fr] gap-2.5";
const EMPTY_ITEMS: MonthlyPerformanceBreakdownItem[] = [];

const drillRowKey = (i: MonthlyPerformanceBreakdownItem) => `${i.service_id}-${i.company_id}-${i.company_type ?? ""}`;

/** Bar under each detail row: grows from zero (from the RTL start) on mount and eases to the new value on re-sort. */
function DrillBar({ pct, color }: { pct: number, color: string }) {
	const [on, setOn] = useState(false);
	useEffect(() => {
		const id = requestAnimationFrame(() => setOn(true));
		return () => cancelAnimationFrame(id);
	}, []);
	return (
		<span className="relative block h-1 rounded-full bg-colorFillSecondary overflow-hidden">
			<span
				className="absolute inset-y-0 rounded-full motion-reduce:transition-none"
				style={{ insetInlineStart: 0, width: `${on ? pct : 0}%`, background: color, transition: "width .6s cubic-bezier(.2,.8,.2,1)" }}
			/>
		</span>
	);
}

interface MonthlyPerformanceDrillModalProps {
	drill: DrillState | null
	onChange: (drill: DrillState) => void
	onClose: () => void
}

/** Financial details of one month of one series, by company; columns are sorted on the server. */
export function MonthlyPerformanceDrillModal({ drill, onChange, onClose }: MonthlyPerformanceDrillModalProps) {
	const { t } = useTranslation();
	const T = useChartTheme();
	const params = drill
		? {
			service_ids: String(drill.serviceId),
			sh_year: drill.year,
			sh_month: drill.month,
			ordering: drill.ordering,
			company_type: drill.companyType,
		}
		: undefined;
	const query = useQuery(widgetDataQuery("monthly-performance-breakdown", params, !!drill));

	// Rows of another point never show as placeholder (spinner instead); rows of the same point stay dimmed while
	// a new ordering is fetched.
	const viewSig = drill ? `${drill.serviceId}-${drill.companyType ?? ""}-${drill.year}-${drill.month}` : "";
	const [view, setView] = useState<{ sig: string, data: MonthlyPerformanceBreakdownResponse | null } | null>(null);
	if (drill && query.data !== undefined && !query.isPlaceholderData && (view?.data !== query.data || view.sig !== viewSig))
		setView({ sig: viewSig, data: query.data });
	const data = view?.sig === viewSig ? view.data : undefined;
	const error = query.isError ? (query.error.message || t("dashboard.widgets.monthlyPerformance.drill.loadError")) : null;
	const loading = !!drill && data === undefined;
	const reloading = !loading && query.isFetching;

	const items = data?.items ?? EMPTY_ITEMS;
	const ordering = drill?.ordering ?? "";
	const sortCol = ordering.replace(/^-/, "");
	const desc = ordering.startsWith("-");
	const barKey = drill?.barKey ?? "income";
	const max = Math.max(1, ...items.map(i => Math.abs(Number(i[barKey]) || 0)));

	// Each company keeps the color of its first appearance so colors do not jump when rows move.
	const colorSig = drill ? `${drill.serviceId}-${drill.year}-${drill.month}` : "";
	const colors = useRef({ sig: "", map: new Map<string, string>() });
	if (colors.current.sig !== colorSig)
		colors.current = { sig: colorSig, map: new Map() };
	items.forEach((i) => {
		const k = drillRowKey(i);
		if (!colors.current.map.has(k))
			colors.current.map.set(k, colorAt(T, colors.current.map.size));
	});

	// FLIP: rows slide from their old place to the new one when sorted.
	const rowRefs = useRef(new Map<string, HTMLDivElement>());
	const prevTops = useRef(new Map<string, number>());
	useLayoutEffect(() => {
		const reduce = prefersReducedMotion();
		const next = new Map<string, number>();
		rowRefs.current.forEach((el, k) => {
			const top = el.getBoundingClientRect().top;
			next.set(k, top);
			const before = prevTops.current.get(k);
			if (before === undefined || reduce)
				return;
			const dy = before - top;
			if (dy)
				el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
		});
		prevTops.current = next;
	}, [items]);

	// Numeric column: first click descending; company name: first click ascending. The next click reverses it.
	const sortBy = (col: DrillColumn) => {
		if (!drill || loading)
			return;
		const first = col === "company_name" ? col : `-${col}`;
		const next = ordering === first ? (first.startsWith("-") ? col : `-${col}`) : first;
		onChange({ ...drill, ordering: next, ...(col !== "company_name" ? { barKey: col } : null) });
	};

	// The Latin service code goes inside <bdi> so the RTL word order of the title is not broken.
	const title = drill ? (
		<>
			{t("dashboard.widgets.monthlyPerformance.drill.title")}
			{" "}
			<bdi>{drill.serviceName || drill.serviceCode}</bdi>
			{drill.companyType ? ` (${companyTypeLabel(drill.serviceCode, drill.companyType)})` : ""}
			{" — "}
			{jalaliMonthLabel(drill.year, drill.month)}
		</>
	) : "";

	return (
		<DashboardModal isOpen={!!drill} onClose={onClose} title={title} maxWidth="max-w-4xl" icon={RiWallet3Line}>
			{error ? (
				<WidgetError message={error} />
			) : loading ? (
				<WidgetSpinnerBox height={200} />
			) : items.length === 0 ? (
				<div className="text-[12.5px] text-colorTextSecondary py-4 text-center">{t("dashboard.common.noData")}</div>
			) : (
				<div dir="rtl" className={`flex flex-col gap-3 transition-opacity ${reloading ? "opacity-60" : ""}`}>
					<div className={`${GRID} pb-1.5 text-[11.5px] text-colorTextTertiary border-0 border-b border-solid border-colorFillSecondary`}>
						{DRILL_COLS.map((col) => {
							const active = sortCol === col;
							const Icon = !active ? RiExpandUpDownLine : desc ? RiArrowDownLine : RiArrowUpLine;
							return (
								<button
									key={col}
									type="button"
									onClick={() => sortBy(col)}
									aria-sort={active ? (desc ? "descending" : "ascending") : "none"}
									className={`bg-transparent border-0 p-0 font-[inherit] cursor-pointer flex items-center gap-1 text-start text-[11.5px] transition-colors hover:text-colorText ${active ? "text-colorText font-semibold" : "text-inherit"}`}
								>
									{col === "company_name" ? t("dashboard.columns.company") : t(`dashboard.metrics.${col}`)}
									<Icon className={`text-[12px] shrink-0 ${active ? "" : "opacity-50"}`} />
								</button>
							);
						})}
					</div>
					{items.map((item) => {
						const profit = Number(item.profit) || 0;
						const barVal = Number(item[barKey]) || 0;
						const pct = Math.max((Math.abs(barVal) / max) * 100, 2);
						const rowKey = drillRowKey(item);
						// Profit: loss red and profit green; every bar fills from the RTL start like income.
						const color = barKey === "profit" ? (barVal < 0 ? T.danger : T.ok) : colors.current.map.get(rowKey)!;
						return (
							<div
								key={rowKey}
								ref={(el) => {
									if (el)
										rowRefs.current.set(rowKey, el);
									else
										rowRefs.current.delete(rowKey);
								}}
								className="flex flex-col gap-1 -mx-2 px-2 py-1.5 -my-1.5 rounded-lg transition-colors duration-200 hover:bg-colorFillQuaternary"
							>
								<div className={`${GRID} items-center text-[12.5px]`}>
									<span className="min-w-0">
										<span className="block break-words">{item.company_name}</span>
										{item.company_type && (
											<span className="block text-[11.5px] text-colorTextTertiary">{companyTypeLabel(item.service_code, item.company_type)}</span>
										)}
									</span>
									<span className="whitespace-nowrap">{formatRial(Number(item.income) || 0)}</span>
									<span className="whitespace-nowrap text-colorTextSecondary">{formatRial(Number(item.expense) || 0)}</span>
									<span className={`whitespace-nowrap ${profit < 0 ? "text-error" : "text-success"}`}>{formatRial(profit)}</span>
								</div>
								<DrillBar pct={pct} color={color} />
							</div>
						);
					})}
				</div>
			)}
		</DashboardModal>
	);
}
