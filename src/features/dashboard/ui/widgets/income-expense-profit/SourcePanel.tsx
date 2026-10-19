import type { CompanyFinancialsPeriod, FinancialMetric } from "#src/features/dashboard/api/dashboard.dto";
import type { ReactNode } from "react";
import { serviceTypeLabel } from "#src/features/dashboard/model/company-type";
import { formatNumber, formatRial, toNum } from "#src/features/dashboard/model/format";
import { periodRangeText } from "#src/features/dashboard/model/jalali";
import { serviceIdsParam } from "#src/features/dashboard/model/types";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { colorAt, useChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import { RiArrowLeftSLine, RiArrowRightLine, RiInformationLine } from "#src/features/dashboard/ui/icons";
import { WidgetError, WidgetNotice, WidgetSpinnerBox } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export type IncomeExpenseSource = "actual" | "prediction";

interface SourcePanelProps {
	source: IncomeExpenseSource
	name: string
	serviceIds: number[]
	range: CompanyFinancialsPeriod
}

const METRICS: FinancialMetric[] = ["income", "expense", "profit"];

/** State swaps are fade-only; the card shell animates the height change. */
function FadeIn({ className, children }: { className: string, children: ReactNode }) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.28, ease: "easeOut" }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/** Each source (actual / prediction) is an independent panel: its own request, drill-down and error. */
export function SourcePanel({ source, name, serviceIds, range }: SourcePanelProps) {
	const { t } = useTranslation();
	const T = useChartTheme();
	const [metric, setMetric] = useState<FinancialMetric | null>(null);
	// The server echoes `metric`, so data and its metric stay together: after a row click the previous view stays
	// until the response arrives (placeholder data of the query).
	const q = useQuery(widgetDataQuery("income-expense-profit", {
		source,
		range,
		metric,
		service_ids: serviceIdsParam(serviceIds),
	}));
	const data = q.data ?? undefined;
	const shownMetric = data?.metric ?? null;
	const loading = q.isFetching;
	const periodText = periodRangeText(data?.period);

	const metricColor: Record<FinancialMetric, string> = { income: T.ok, expense: T.danger, profit: T.link };

	// Three clickable rows with a 6px bar proportional to the biggest absolute value (a pie was unreadable
	// because expense is several times the income).
	const overviewRows = useMemo(() => {
		if (!data?.totals)
			return [];
		const values = METRICS.map(key => ({ key, value: toNum(data.totals?.[key]) ?? 0 }));
		const max = Math.max(...values.map(v => Math.abs(v.value)), 1);
		return values.map(v => ({ ...v, pct: Math.max((Math.abs(v.value) / max) * 100, 1.5) }));
	}, [data]);

	const profitMargin = useMemo(() => {
		if (!data?.totals)
			return null;
		const income = toNum(data.totals.income) ?? 0;
		const profit = toNum(data.totals.profit) ?? 0;
		return income ? (profit / income) * 100 : null;
	}, [data]);

	// A row is identified by service_id + company_type, not only service_code: company_type-gated services split
	// into several rows.
	const breakdownRows = useMemo(() => {
		if (!data?.breakdown)
			return [];
		const amounts = data.breakdown.map(item => Math.abs(toNum(item.amount) ?? 0));
		const total = amounts.reduce((sum, v) => sum + v, 0) || 1;
		const max = Math.max(...amounts, 1);
		return data.breakdown.map((item, index) => ({
			key: `${item.service_id}-${item.company_type ?? "none"}`,
			label: serviceTypeLabel(item, item.company_type),
			color: colorAt(T, index),
			value: toNum(item.amount) ?? 0,
			share: (amounts[index] / total) * 100,
			pct: Math.max((amounts[index] / max) * 100, 1.5),
		}));
	}, [data, T]);

	let content: ReactNode;
	if (q.isError) {
		content = <FadeIn key="error" className="overflow-hidden"><WidgetError message={q.error.message} /></FadeIn>;
	}
	else if (loading && !data) {
		content = <FadeIn key="loading" className="overflow-hidden"><WidgetSpinnerBox height={180} /></FadeIn>;
	}
	else if (data?.available === false) {
		content = <FadeIn key="unavailable" className="overflow-hidden"><WidgetNotice /></FadeIn>;
	}
	else if (shownMetric) {
		content = (
			<FadeIn key="breakdown" className="overflow-hidden flex flex-col flex-1">
				<div className="flex flex-col gap-3 flex-1 justify-between">
					<div className="flex items-center justify-between gap-2">
						<button
							type="button"
							onClick={() => setMetric(null)}
							className="flex items-center gap-1.5 text-[12.5px] text-primaryText hover:underline bg-transparent border-0 p-0 font-[inherit] cursor-pointer"
						>
							<RiArrowRightLine className="text-sm" />
							{t("dashboard.widgets.incomeExpense.back")}
						</button>
						<span className="text-[12.5px] text-colorTextSecondary">
							{t("dashboard.widgets.incomeExpense.breakdownTitle", { metric: t(`dashboard.metrics.${shownMetric}`) })}
						</span>
					</div>
					{breakdownRows.length === 0
						? <div className="py-6 text-center text-[13px] text-colorTextTertiary">{t("dashboard.common.noData")}</div>
						: breakdownRows.map((row, i) => (
							<motion.div
								key={row.key}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.32, ease: "easeOut", delay: 0.06 + i * 0.05 }}
								className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-1 items-center text-[12.5px]"
							>
								<span className="flex items-center gap-1.5">
									<span className="w-2 h-2 rounded-sm shrink-0" style={{ background: row.color }} />
									{row.label}
								</span>
								<span className="text-colorTextSecondary whitespace-nowrap">
									{formatRial(row.value)}
									{" · "}
									{formatNumber(row.share, { maximumFractionDigits: 0 })}
									٪
								</span>
								<span className="col-span-2 block h-1.5 rounded-full bg-colorFillSecondary overflow-hidden">
									<motion.span
										className="block h-full rounded-full"
										initial={{ width: 0 }}
										animate={{ width: `${row.pct}%` }}
										transition={{ duration: 0.8, ease: "easeOut", delay: 0.12 + i * 0.05 }}
										style={{ background: row.color }}
									/>
								</span>
							</motion.div>
						))}
				</div>
			</FadeIn>
		);
	}
	else {
		content = (
			<FadeIn key="overview" className="overflow-hidden flex flex-col flex-1">
				<div className="flex flex-col gap-2 flex-1">
					{overviewRows.map((row, i) => (
						<motion.button
							key={row.key}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.32, ease: "easeOut", delay: 0.06 + i * 0.07 }}
							type="button"
							onClick={() => setMetric(row.key)}
							className="flex flex-col justify-center gap-2 flex-1 p-3 rounded-[10px] border border-solid border-colorBorder bg-colorFillQuaternary text-colorText text-start font-[inherit] cursor-pointer transition-colors hover:border-primary hover:bg-primaryBg"
						>
							<span className="flex items-center gap-2 w-full text-[12.5px] text-colorTextSecondary">
								<span className="w-2 h-2 rounded-sm shrink-0" style={{ background: metricColor[row.key] }} />
								{t(`dashboard.metrics.${row.key}`)}
								<span className="ms-auto flex items-baseline gap-1 whitespace-nowrap text-colorText">
									<strong className="text-[16px] font-semibold">{formatRial(row.value)}</strong>
								</span>
								<RiArrowLeftSLine className="text-sm text-colorTextTertiary" />
							</span>
							<span className="block w-full h-1.5 rounded-full bg-colorFillSecondary overflow-hidden">
								<motion.span
									className="block h-full rounded-full"
									initial={{ width: 0 }}
									animate={{ width: `${row.pct}%` }}
									transition={{ duration: 0.8, ease: "easeOut", delay: 0.12 + i * 0.07 }}
									style={{ background: metricColor[row.key] }}
								/>
							</span>
						</motion.button>
					))}
					<span className="flex items-center gap-1.5 pt-0.5 text-[12px] text-colorTextSecondary whitespace-nowrap">
						<RiInformationLine className="text-sm" />
						{profitMargin === null
							? t("dashboard.widgets.incomeExpense.noIncome")
							: t("dashboard.widgets.incomeExpense.profitMargin", { value: formatNumber(profitMargin, { maximumFractionDigits: 1 }) })}
					</span>
				</div>
			</FadeIn>
		);
	}

	return (
		<section
			aria-label={name}
			className={`flex flex-col gap-3 min-w-0 p-3.5 rounded-[12px] border border-solid border-colorBorder text-colorText transition-opacity duration-200 ${loading && data ? "opacity-70" : ""}`}
		>
			<h4 className="m-0 flex items-center gap-2 text-[13px] font-semibold text-colorText">
				<span className={`w-1 h-4 rounded-sm ${source === "actual" ? "bg-primary" : "bg-colorTextTertiary"}`} />
				{name}
				{periodText && <span className="ms-auto text-[12px] font-normal text-colorTextSecondary">{periodText}</span>}
			</h4>
			{/* State swaps are fade-only; the card shell (animateSize) animates the height change in one go. */}
			{content}
		</section>
	);
}
