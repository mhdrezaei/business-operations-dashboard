import type { FinancialMetric, MonthlyPerformanceResponse } from "#src/features/dashboard/api/dashboard.dto";
import type { YearMonth } from "#src/features/dashboard/model/jalali";
import type { DashboardWidgetProps } from "#src/features/dashboard/model/types";
import type { DrillState } from "./MonthlyPerformanceDrillModal";
import type { PerformanceSeries } from "./performance-series";
import { FINANCIAL_METRICS } from "#src/features/dashboard/model/financial";
import { formatRial, formatRialCompact } from "#src/features/dashboard/model/format";
import { buildShPeriodsRange, jalaliMonthLabel, shPeriodKey } from "#src/features/dashboard/model/jalali";
import { consumePendingMonthlyMetric, SET_MONTHLY_METRIC_EVENT } from "#src/features/dashboard/model/navigation";
import { serviceIdsParam } from "#src/features/dashboard/model/types";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { useChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import { PerformanceLineChart } from "#src/features/dashboard/ui/charts/PerformanceLineChart";
import { RangeFields } from "#src/features/dashboard/ui/filters/RangeFilterPanel";
import { RiLineChartLine } from "#src/features/dashboard/ui/icons";
import { WidgetCardShell, WidgetError, WidgetSpinnerBox } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useDashboardServices } from "#src/features/dashboard/ui/use-dashboard-services";
import { i18n } from "#src/locales";
import { useQuery } from "@tanstack/react-query";
import { Segmented } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { MonthlyPerformanceDrillModal } from "./MonthlyPerformanceDrillModal";
import { buildLegendGroups, buildPerformanceSeries, isFinancialMetric, orderSeries, serviceIdsWithTypes } from "./performance-series";
import { PerformanceLegend } from "./PerformanceLegend";

/**
 * Range total: null means "no data" and shows "—", not zero. The minus sign stays inside an ltr block so it sits
 * left of the number (in RTL text it would jump to the right).
 */
function formatTotal(value: string | null) {
	if (value === null || value === undefined)
		return "—";
	// formatRialCompact = "<signed number>" + optional " <unit>"
	const text = formatRialCompact(value);
	const gap = text.indexOf(" ");
	const number = gap < 0 ? text : text.slice(0, gap);
	return (
		<>
			<bdi dir="ltr">{number}</bdi>
			{text.slice(number.length)}
			{" "}
			{i18n.t("dashboard.common.rialUnit")}
		</>
	);
}

/** Monthly income/expense/profit line chart per service (and company type), with a by-company drill-down. */
export function MonthlyPerformanceWidget({ canDrilldown, serviceIds, range, onRangeChange, hideRangeBar }: DashboardWidgetProps) {
	const { t } = useTranslation();
	const T = useChartTheme();
	// Unlike the others this endpoint requires service_ids; with an empty global filter ("all") every permitted
	// performance service is sent.
	const { performanceServiceIds } = useDashboardServices();
	const effectiveServiceIds = serviceIds.length > 0 ? serviceIds : performanceServiceIds;

	const [metric, setMetric] = useState<FinancialMetric>(() => {
		const pending = consumePendingMonthlyMetric();
		return isFinancialMetric(pending) ? pending : "income";
	});
	// Clicking the income/expense/profit cards of the KPI strip switches the metric here while scrolling.
	useEffect(() => {
		const onSetMetric = (e: Event) => {
			const next = (e as CustomEvent<{ metric?: unknown } | undefined>).detail?.metric;
			if (isFinancialMetric(next))
				setMetric(next);
			consumePendingMonthlyMetric();
		};
		window.addEventListener(SET_MONTHLY_METRIC_EVENT, onSetMetric);
		return () => window.removeEventListener(SET_MONTHLY_METRIC_EVENT, onSetMetric);
	}, []);
	const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
	// Services whose company_type split the user opened (instead of the total series).
	const [expandedServiceIds, setExpandedServiceIds] = useState<number[]>([]);
	const [drill, setDrill] = useState<DrillState | null>(null);

	const periods = useMemo(() => buildShPeriodsRange(range.from, range.to), [range]);
	const query = useQuery(widgetDataQuery("monthly-performance", {
		service_ids: serviceIdsParam(effectiveServiceIds),
		sh_periods: periods.map(p => shPeriodKey(p.year, p.month)).join(","),
	}, effectiveServiceIds.length > 0));

	// Months of the response on screen: until the new range's data arrives the chart keeps the previous view
	// (instead of an empty chart with the new labels) and then the lines shorten/extend.
	const [view, setView] = useState<{ data: MonthlyPerformanceResponse | null, periods: YearMonth[] } | null>(null);
	if (query.data !== undefined && !query.isPlaceholderData && view?.data !== query.data)
		setView({ data: query.data, periods });
	const data = effectiveServiceIds.length > 0 ? view?.data ?? null : null;
	const chartPeriods = view?.periods ?? periods;
	const xLabels = useMemo(() => chartPeriods.map(p => jalaliMonthLabel(p.year, p.month)), [chartPeriods]);
	const loading = effectiveServiceIds.length > 0 && query.isFetching;
	const error = query.isError ? (query.error.message || t("dashboard.widgets.monthlyPerformance.loadError")) : null;

	const rawSeries = useMemo(() => data?.series ?? [], [data]);
	const withTypes = useMemo(() => serviceIdsWithTypes(rawSeries), [rawSeries]);
	const orderedSeries = useMemo(() => orderSeries(rawSeries, withTypes), [rawSeries, withTypes]);
	const allSeries = useMemo(
		() => buildPerformanceSeries(orderedSeries, withTypes, expandedServiceIds, chartPeriods, metric, T),
		[orderedSeries, withTypes, expandedServiceIds, chartPeriods, metric, T],
	);
	const legendGroups = useMemo(() => buildLegendGroups(allSeries, rawSeries, withTypes), [allSeries, rawSeries, withTypes]);
	const visibleSeries = useMemo(() => allSeries.filter(s => !hiddenKeys.includes(s.key)), [allSeries, hiddenKeys]);

	const toggleSeries = (key: string) => {
		setHiddenKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
	};
	const toggleExpanded = (serviceId: number) => {
		setExpandedServiceIds(prev => (prev.includes(serviceId) ? prev.filter(i => i !== serviceId) : [...prev, serviceId]));
	};

	// Default order of the details: highest value of the metric the chart shows.
	const openDrilldown = (s: PerformanceSeries, pointIndex: number) => {
		const point = s.points[pointIndex]?.raw;
		if (!canDrilldown || !point)
			return;
		setDrill({
			serviceId: s.serviceId,
			serviceCode: s.serviceCode,
			serviceName: s.serviceName,
			companyType: s.companyType,
			year: point.sh_year,
			month: point.sh_month,
			ordering: `-${metric}`,
			barKey: metric,
		});
	};

	return (
		<WidgetCardShell
			refreshing={loading && !!data}
			icon={<RiLineChartLine className="text-[19px] text-success" />}
			title={t(`dashboard.widgets.monthlyPerformance.titles.${metric}`)}
			description={t("dashboard.widgets.monthlyPerformance.description")}
			headerExtra={(
				<Segmented
					size="small"
					value={metric}
					onChange={setMetric}
					options={FINANCIAL_METRICS.map(m => ({ value: m, label: t(`dashboard.metrics.${m}`) }))}
				/>
			)}
		>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				{!hideRangeBar && (
					<div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 rounded-xl bg-colorFillQuaternary border border-solid border-[var(--dash-border)]">
						<RangeFields range={range} onChange={onRangeChange} />
					</div>
				)}
				{data?.totals && (
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-colorTextTertiary">
						<span>{t("dashboard.widgets.monthlyPerformance.rangeTotals")}</span>
						{FINANCIAL_METRICS.map(m => (
							<span key={m}>
								{t(`dashboard.metrics.${m}`)}
								{" "}
								<strong className="font-semibold text-colorText">{formatTotal(data.totals[m])}</strong>
							</span>
						))}
					</div>
				)}
			</div>

			{allSeries.length > 0 && (
				<PerformanceLegend
					groups={legendGroups}
					hiddenKeys={hiddenKeys}
					expandedServiceIds={expandedServiceIds}
					onToggleSeries={toggleSeries}
					onToggleExpanded={toggleExpanded}
				/>
			)}

			{error ? (
				<WidgetError message={error} />
			) : loading && !data ? (
				<WidgetSpinnerBox height={380} />
			) : (
				<PerformanceLineChart
					series={visibleSeries}
					xLabels={xLabels}
					onPointClick={canDrilldown ? openDrilldown : undefined}
					valueFormatter={formatRial}
				/>
			)}

			<MonthlyPerformanceDrillModal drill={drill} onChange={setDrill} onClose={() => setDrill(null)} />
		</WidgetCardShell>
	);
}
