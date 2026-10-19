import type { HomeDashboardResponse } from "#src/features/dashboard/api/dashboard.dto";
import type { UseQueryResult } from "@tanstack/react-query";
import { getCurrentJalali, jalaliMonthLabel, shiftJalaliMonth } from "#src/features/dashboard/model/jalali";
import { homeDashboardQuery, widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export interface KpiTiles {
	/** Previous Jalali month, e.g. "مرداد ۱۴۰۵". */
	monthLabel: string
	rate: { percentage: number | null, registered: number | null, total: number | null }
	unregistered: { total: number | null, topService: string | null }
	expiring: { total: number | null, peakLabel: string | null }
	/** Base contracts + addenda (business approval totals). */
	approval: { pending: number | null, total: number | null }
}

/** Counter keys of /home/dashboard/ — only for the "loading" state that shows the full layout with zeros. */
export const ZERO_DASHBOARD: Partial<HomeDashboardResponse> = {
	total_companies_count: 0,
	active_contracts_count: 0,
	pending_business_approval_count: 0,
	pending_sign_approval_count: 0,
	approved_not_in_sign_flow_count: 0,
	real_sign_in_progress_count: 0,
	real_signed_count: 0,
};

function previousMonthLabel() {
	const prev = shiftJalaliMonth(getCurrentJalali(), -1);
	return jalaliMonthLabel(prev.year, prev.month);
}

/** A key changed and its response is still in flight (previous data is only a placeholder). */
const isWaiting = (q: UseQueryResult<unknown>) => q.isPending || q.isPlaceholderData;

function byCount<T extends { count: number }>(items: T[] | undefined) {
	return (items ?? []).reduce<T | null>((top, item) => ((item.count || 0) > (top?.count || 0) ? item : top), null);
}

const PLACEHOLDER_RATE = { percentage: null, registered: 0, total: 0 };

/**
 * The four tiles behind the strip plus the /home/dashboard/ counters. Every tile is independent: a failing endpoint
 * must not keep the whole strip in the zero layout — only that tile shows "—".
 */
export function useKpiData(serviceIds: string | undefined) {
	const params = { service_ids: serviceIds };
	const rateQ = useQuery(widgetDataQuery("registered-performance-rate", params));
	const unregisteredQ = useQuery(widgetDataQuery("unregistered-performances", params));
	const expiringQ = useQuery(widgetDataQuery("contracts-expiring", { ...params, months_ahead: 6 }));
	const approvalQ = useQuery(widgetDataQuery("contracts-approval-status", params));
	const dashboardQ = useQuery(homeDashboardQuery(serviceIds));
	const queries = [rateQ, unregisteredQ, expiringQ, approvalQ];
	// First load (no previous data to keep): the full layout with zeros until every tile has answered.
	const firstLoad = queries.some(q => q.isPending);

	const rate = rateQ.data;
	const unregistered = unregisteredQ.data;
	const expiring = expiringQ.data;
	const approval = approvalQ.data;
	const tiles = useMemo<KpiTiles>(() => {
		if (firstLoad) {
			return {
				monthLabel: previousMonthLabel(),
				rate: PLACEHOLDER_RATE,
				unregistered: { total: 0, topService: null },
				expiring: { total: 0, peakLabel: null },
				approval: { pending: 0, total: 0 },
			};
		}
		const topUnregistered = byCount(unregistered?.by_service);
		const peakBucket = byCount(expiring?.buckets);
		return {
			monthLabel: previousMonthLabel(),
			rate: {
				percentage: rate && rate.total_count > 0 ? rate.percentage : null,
				registered: rate?.registered_count ?? null,
				total: rate?.total_count ?? null,
			},
			unregistered: { total: unregistered?.total ?? null, topService: topUnregistered?.service_name ?? null },
			expiring: {
				total: expiring ? expiring.buckets.reduce((sum, b) => sum + (b.count || 0), 0) : null,
				peakLabel: peakBucket ? jalaliMonthLabel(peakBucket.sh_year, peakBucket.sh_month) : null,
			},
			approval: {
				pending: approval?.total?.business_approval?.pending ?? null,
				total: approval?.total?.business_approval?.total ?? null,
			},
		};
	}, [firstLoad, rate, unregistered, expiring, approval]);

	const tilesLoading = queries.some(isWaiting);
	const dashboardDone = !isWaiting(dashboardQ);
	return {
		tiles,
		/** No tile arrived at all: the strip shows an error box instead. */
		failed: !tilesLoading && queries.every(q => q.isError),
		/** Animations wait for both the tiles and the dashboard counters, so they play only once. */
		pending: tilesLoading || !dashboardDone,
		dashboard: dashboardDone ? dashboardQ.data ?? null : ZERO_DASHBOARD,
	};
}
