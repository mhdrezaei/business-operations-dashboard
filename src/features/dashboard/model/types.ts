import type { YearMonth } from "./jalali";

/** Shared month range of the monthly-performance chart and KPI cards. */
export interface DashboardRange {
	from: YearMonth
	to: YearMonth
}

export interface DashboardService {
	id: number
	code: string
	name: string
}

/** Props every dashboard card receives from the section. */
export interface DashboardWidgetProps {
	title: string
	/** `monthly-performance-breakdown` is allowed → points of the line chart are clickable. */
	canDrilldown: boolean
	/** Global service filter; empty = all services (the parameter is not sent). */
	serviceIds: number[]
	range: DashboardRange
	onRangeChange: (range: DashboardRange) => void
	/** The floating range panel is active, so the inline range bar of the chart card is hidden. */
	hideRangeBar: boolean
}

/** `service_ids` CSV of the global filter; undefined = all services. */
export function serviceIdsParam(serviceIds: number[]) {
	return serviceIds.length ? serviceIds.join(",") : undefined;
}
