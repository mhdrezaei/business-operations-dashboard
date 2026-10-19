import { fetchSignFlowsList } from "#src/features/contract/api/contracts.api";
import { queryOptions } from "@tanstack/react-query";

/** Shares one request between the KPI strip and the contracts card (same stale time as the dashboard summary). */
const SHARE_TTL_MS = 5000;

export const homeKeys = {
	pendingSignFlows: ["home", "pending-sign-flows"] as const,
};

/** Sign flows assigned to the user; only the `count` of a one-row page is read. */
export function pendingSignFlowsQuery() {
	return queryOptions({
		queryKey: homeKeys.pendingSignFlows,
		queryFn: () => fetchSignFlowsList({ mine: "assigned", page: 1, page_size: 1 }),
		select: page => page.count,
		staleTime: SHARE_TTL_MS,
	});
}
