import type { WidgetParams } from "#src/features/dashboard/api/dashboard.api";
import type { WidgetKey } from "#src/features/dashboard/api/dashboard.dto";
import { fetchHomeDashboard, fetchHomeWidgetData, fetchHomeWidgets } from "#src/features/dashboard/api/dashboard.api";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

/**
 * The KPI strip and the cards below read several identical endpoints at the same time (each takes seconds on the
 * server); a short stale time shares one request between them without keeping data stale after an edit.
 * Errors are never cached by TanStack Query.
 */
const SHARE_TTL_MS = 5000;

export const dashboardKeys = {
	all: ["dashboard"] as const,
	widgets: () => [...dashboardKeys.all, "widgets"] as const,
	summary: (serviceIds: string | undefined) => [...dashboardKeys.all, "summary", { serviceIds }] as const,
	widget: (key: WidgetKey, params: WidgetParams | undefined) => [...dashboardKeys.all, "widget", key, params ?? {}] as const,
};

export function homeWidgetsQuery() {
	return queryOptions({
		queryKey: dashboardKeys.widgets(),
		queryFn: fetchHomeWidgets,
		staleTime: 5 * 60 * 1000,
	});
}

/** Previous data stays while the filter changes, so counters do not replay from zero. */
export function homeDashboardQuery(serviceIds: string | undefined) {
	return queryOptions({
		queryKey: dashboardKeys.summary(serviceIds),
		queryFn: () => fetchHomeDashboard(serviceIds),
		staleTime: SHARE_TTL_MS,
		placeholderData: keepPreviousData,
	});
}

/**
 * Data of one widget; `null` = 404 (unknown key or no access → "do not show").
 * Previous data stays until the new response arrives (cards dim and show a spinner instead of collapsing).
 */
export function widgetDataQuery<K extends WidgetKey>(key: K, params?: WidgetParams, enabled = true) {
	return queryOptions({
		queryKey: dashboardKeys.widget(key, params),
		queryFn: () => fetchHomeWidgetData(key, params),
		staleTime: SHARE_TTL_MS,
		placeholderData: keepPreviousData,
		enabled,
	});
}

function scopeOf(params: WidgetParams | undefined, viewParams: readonly string[]) {
	return JSON.stringify(Object.entries(params ?? {}).filter(([name]) => !viewParams.includes(name)));
}

/**
 * Drill-down list of one target (a card row/segment). The previous page/tab stays on screen while the next one loads
 * (only `viewParams` differ), but never the list of another target — a reopened modal starts empty.
 */
export function scopedWidgetQuery<K extends WidgetKey>(key: K, params: WidgetParams, enabled: boolean, viewParams: readonly string[] = ["page", "page_size"]) {
	return queryOptions({
		...widgetDataQuery(key, params, enabled),
		placeholderData: (previous, previousQuery) =>
			previousQuery && scopeOf(previousQuery.queryKey[3] as WidgetParams, viewParams) === scopeOf(params, viewParams) ? previous : undefined,
	});
}
