import type { CompanyFinancialsPeriod, FinancialMetric, SortOrder } from "#src/features/dashboard/api/dashboard.dto";
import type { DashboardWidgetProps } from "#src/features/dashboard/model/types";
import { DEFAULT_FINANCIAL_RANGE, FINANCIAL_METRICS, FINANCIAL_RANGES } from "#src/features/dashboard/model/financial";
import { formatCount } from "#src/features/dashboard/model/format";
import { periodRangeText } from "#src/features/dashboard/model/jalali";
import { serviceIdsParam } from "#src/features/dashboard/model/types";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { useChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import { RiSearchLine, RiTable2 } from "#src/features/dashboard/ui/icons";
import { WidgetCardShell, WidgetError, WidgetSpinnerBox } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "ahooks";
import { Button, Input, Segmented } from "antd";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildChartModel, isNegative, metricColor, PAGE_SIZE, SEARCH_DEBOUNCE_MS, useStableValue } from "./company-financials.model";
import { CompanyFinancialsTable } from "./CompanyFinancialsTable";
import { ConcentrationPanel } from "./ConcentrationPanel";
import { RollingMoney } from "./RollingMoney";

interface SortState {
	by: FinancialMetric
	order: SortOrder
}

/** «Company financials» card: totals, income/expense concentration bars and the server-sorted table. */
export function CompanyFinancialsWidget({ title, serviceIds }: DashboardWidgetProps) {
	const { t } = useTranslation();
	const T = useChartTheme();
	const [period, setPeriod] = useState<CompanyFinancialsPeriod>(DEFAULT_FINANCIAL_RANGE);
	const [sort, setSort] = useState<SortState>({ by: "income", order: "desc" });
	const [searchInput, setSearchInput] = useState("");
	const search = useDebounce(searchInput.trim(), { wait: SEARCH_DEBOUNCE_MS });
	const [hover, setHover] = useState<string | null>(null);
	const serviceKey = serviceIdsParam(serviceIds);
	// The page is bound to the filter signature: any filter/sort/search/period change makes it 1 without an extra render or request.
	const filterSig = [period, sort.by, sort.order, search, serviceKey ?? ""].join("|");
	const [pageState, setPageState] = useState({ sig: filterSig, page: 1 });
	const page = pageState.sig === filterSig ? pageState.page : 1;
	const setPage = (next: number) => setPageState({ sig: filterSig, page: next });
	const toggleSort = (metric: FinancialMetric) => setSort(s => ({ by: metric, order: s.by === metric && s.order === "desc" ? "asc" : "desc" }));

	const q = useQuery(widgetDataQuery("company-financials", {
		sort_by: sort.by,
		sort_period: period,
		order: sort.order,
		page,
		page_size: PAGE_SIZE,
		search: search || undefined,
		service_ids: serviceKey,
	}));
	const data = q.data ?? undefined;
	const loading = q.isFetching;

	// Bumps with every new response so rows remount and replay their entrance animation.
	const genRef = useRef({ data, gen: 0 });
	if (genRef.current.data !== data)
		genRef.current = { data, gen: genRef.current.gen + (data ? 1 : 0) };
	const gen = genRef.current.gen;

	const chart = useStableValue(data?.chart);
	const { colorOf, legend, stacks } = buildChartModel(chart, T, t("dashboard.widgets.companyFinancials.other"));

	// 404 = no access to any performance service → the whole card is hidden.
	if (q.data === null)
		return null;

	const rows = data?.results ?? [];
	const totalPages = data?.total_pages ?? 1;
	const totals = data?.totals?.[period];
	const rangeText = periodRangeText(data?.periods?.[period]);
	// The arrow direction comes from the server response, not local state.
	const serverSortBy = data && data.sort_period === period ? data.sort_by : null;
	const serverOrder = data?.order ?? sort.order;
	const companiesCount = data ? t("dashboard.widgets.companyFinancials.companiesCount", { n: formatCount(data.count) }) : "";

	return (
		<WidgetCardShell
			refreshing={loading && !!data}
			icon={<RiTable2 className="text-primaryText" />}
			title={title || t("dashboard.page.sections.companyFinancials")}
			description={rangeText ? t("dashboard.widgets.companyFinancials.description", { range: rangeText }) : t("dashboard.widgets.companyFinancials.descriptionDefault")}
			headerExtra={(
				<Segmented
					size="small"
					value={period}
					onChange={value => setPeriod(value)}
					options={FINANCIAL_RANGES.map(r => ({ value: r, label: t(`dashboard.ranges.${r}`) }))}
				/>
			)}
		>
			{q.isPending
				? <WidgetSpinnerBox height={260} />
				: q.error && !data
					? <WidgetError message={q.error.message} />
					: (
						<>
							{totals && (
								<div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-2.5">
									{FINANCIAL_METRICS.map(m => (
										<div
											key={m}
											className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] bg-colorFillQuaternary border border-solid border-colorBorder cursor-default transition-[transform,border-color,box-shadow,background-color] duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[3px] hover:border-primary hover:bg-colorFillTertiary hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
										>
											<span className="w-[3px] h-[26px] rounded-sm shrink-0" style={{ background: isNegative(totals[m]) ? T.danger : metricColor(T, m) }} />
											<span className="flex flex-col leading-[1.35] min-w-0">
												<span className="text-[12px] text-colorTextTertiary whitespace-nowrap">{t(`dashboard.metrics.${m}`)}</span>
												<span className="flex items-baseline gap-1.5">
													<RollingMoney
														value={totals[m]}
														spinning={loading}
														className={`text-[15px] font-semibold tabular-nums whitespace-nowrap ${isNegative(totals[m]) ? "text-error" : ""}`}
													/>
													<span className="text-[11px] text-colorTextTertiary">{t("dashboard.common.rialUnit")}</span>
												</span>
											</span>
											{m === "income" && data && <span className="ms-auto text-[11.5px] text-colorTextTertiary whitespace-nowrap">{companiesCount}</span>}
										</div>
									))}
								</div>
							)}

							{/* The chart comes from the same response as the table; it does not depend on the page/sort and is hidden for an old backend (no chart). Its shares are relative to the whole filter. */}
							{stacks.some(st => st.segs.length > 0) && <ConcentrationPanel stacks={stacks} legend={legend} hover={hover} setHover={setHover} />}

							<Input
								allowClear
								value={searchInput}
								onChange={e => setSearchInput(e.target.value)}
								prefix={<RiSearchLine className="text-colorTextTertiary" />}
								placeholder={t("dashboard.common.searchCompany")}
								aria-label={t("dashboard.widgets.companyFinancials.searchAria")}
								className="w-full max-w-[340px]"
							/>

							{q.error && <WidgetError message={q.error.message} />}

							{!data || rows.length === 0
								? <div className="grid place-items-center h-[120px] text-[12.5px] text-colorTextTertiary">{t("dashboard.common.listEmpty")}</div>
								: (
									<CompanyFinancialsTable
										data={data}
										rows={rows}
										period={period}
										gen={gen}
										colorOf={colorOf}
										serverSortBy={serverSortBy}
										serverOrder={serverOrder}
										totals={totals}
										T={T}
										onSort={toggleSort}
										setHover={setHover}
									/>
								)}
							{rows.length > 0 && <p className="m-0 text-[11px] text-colorTextTertiary">{t("dashboard.widgets.companyFinancials.footnote")}</p>}

							{data && rows.length > 0 && (
								<div className="flex items-center justify-between gap-2">
									<Button size="small" disabled={loading || page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>
										{t("dashboard.pager.prev")}
									</Button>
									<span className="text-[12.5px] text-colorTextSecondary">
										{t("dashboard.widgets.companyFinancials.pagerInfo", { page: formatCount(data.page), total: formatCount(totalPages), n: formatCount(data.count) })}
									</span>
									<Button size="small" disabled={loading || page >= totalPages} onClick={() => setPage(page + 1)}>
										{t("dashboard.pager.next")}
									</Button>
								</div>
							)}
						</>
					)}
		</WidgetCardShell>
	);
}
