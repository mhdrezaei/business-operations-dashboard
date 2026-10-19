import type { FinancialMetric, MonthlyPerformancePoint, MonthlyPerformanceSeries } from "#src/features/dashboard/api/dashboard.dto";
import type { YearMonth } from "#src/features/dashboard/model/jalali";
import type { ChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import type { LineSeries } from "#src/features/dashboard/ui/charts/PerformanceLineChart";
import { serviceTypeLabel } from "#src/features/dashboard/model/company-type";
import { FINANCIAL_METRICS } from "#src/features/dashboard/model/financial";
import { shPeriodKey } from "#src/features/dashboard/model/jalali";
import { colorAt } from "#src/features/dashboard/ui/charts/chart-theme";
import { i18n } from "#src/locales";

export interface PerformanceSeries extends LineSeries<MonthlyPerformancePoint> {
	serviceId: number
	serviceCode: string
	serviceName: string | null
	companyType: string | null
	isTotal: boolean
}

/** One capsule of the legend: the visible series of a service. */
export interface LegendGroup {
	serviceId: number
	series: PerformanceSeries[]
	/** The service has company_type series (split/merge button). */
	expandable: boolean
	typeCount: number
}

export function isFinancialMetric(value: unknown): value is FinancialMetric {
	return FINANCIAL_METRICS.includes(value as FinancialMetric);
}

/** A service "has company types" when at least one of its series has a non-null company_type. */
export function serviceIdsWithTypes(series: MonthlyPerformanceSeries[]) {
	return new Set(series.filter(s => s.company_type != null).map(s => s.service_id));
}

/**
 * The backend gives no fixed order; so that order and colors do not jump when a split is opened/closed, all series
 * are sorted once in a stable way (services without company_type first, then with it; inside each group service →
 * total → company type). The color comes from the position in this full list, not in the filtered one.
 */
export function orderSeries(series: MonthlyPerformanceSeries[], withTypes: Set<number>) {
	return [...series].sort((a, b) =>
		Number(withTypes.has(a.service_id)) - Number(withTypes.has(b.service_id))
		|| a.service_id - b.service_id
		|| Number(!!b.is_total) - Number(!!a.is_total)
		|| String(a.company_type ?? "").localeCompare(String(b.company_type ?? "")));
}

/**
 * Default: total series + services without company_type. An expanded service shows its company_type series instead
 * of its total (never both).
 */
export function buildPerformanceSeries(
	ordered: MonthlyPerformanceSeries[],
	withTypes: Set<number>,
	expandedServiceIds: number[],
	periods: YearMonth[],
	metric: FinancialMetric,
	T: ChartTheme,
): PerformanceSeries[] {
	return ordered
		.map((s, fullIndex) => ({ s, fullIndex }))
		.filter(({ s }) => {
			if (!withTypes.has(s.service_id))
				return true;
			return expandedServiceIds.includes(s.service_id) ? !s.is_total : !!s.is_total;
		})
		.map(({ s, fullIndex }) => {
			const byKey = new Map(s.points.map(p => [shPeriodKey(p.sh_year, p.sh_month), p]));
			return {
				key: `${s.service_id}-${s.is_total ? "total" : s.company_type ?? "none"}`,
				label: s.is_total
					? i18n.t("dashboard.widgets.monthlyPerformance.totalSeries", { name: s.service_name || s.service_code })
					: serviceTypeLabel(s, s.company_type),
				color: colorAt(T, fullIndex),
				serviceId: s.service_id,
				serviceCode: s.service_code,
				serviceName: s.service_name,
				companyType: s.company_type,
				isTotal: !!s.is_total,
				points: periods.map((p) => {
					const point = byKey.get(shPeriodKey(p.year, p.month));
					return { value: point ? Number(point[metric]) : null, raw: point };
				}),
			};
		});
}

/** Visible series grouped by service in order; each group is one capsule in the legend. */
export function buildLegendGroups(series: PerformanceSeries[], all: MonthlyPerformanceSeries[], withTypes: Set<number>) {
	const groups = new Map<number, LegendGroup>();
	series.forEach((s) => {
		let group = groups.get(s.serviceId);
		if (!group) {
			const typeCount = all.filter(x => x.service_id === s.serviceId && x.company_type != null).length;
			group = { serviceId: s.serviceId, series: [], expandable: withTypes.has(s.serviceId), typeCount };
			groups.set(s.serviceId, group);
		}
		group.series.push(s);
	});
	return [...groups.values()];
}
