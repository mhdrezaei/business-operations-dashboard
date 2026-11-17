import { fetchServices } from "#src/api/common/common.api";
import { fetchAllPages } from "#src/api/fetch-all-pages";
import { fetchAdminRolesList } from "#src/features/audit/admin-roles/api/admin-roles.api";
import { fetchAdminUsersList } from "#src/features/audit/admin-users/api/admin-users.api";
import { queryOptions } from "@tanstack/react-query";
import { fetchRecentNotificationRuns } from "../api/notification-rules.api";

export function notificationRuleServicesQuery() {
	return queryOptions({
		queryKey: ["common", "services", "notification-rules"],
		queryFn: fetchServices,
		staleTime: 5 * 60 * 1000,
	});
}

export function notificationRuleUsersQuery() {
	return queryOptions({
		queryKey: ["audit", "admin-users", "notification-rules-options"],
		queryFn: () => fetchAllPages(page => fetchAdminUsersList({ page, page_size: 200 })),
		staleTime: 5 * 60 * 1000,
	});
}

export function notificationRuleRolesQuery() {
	return queryOptions({
		queryKey: ["audit", "admin-roles", "notification-rules-options"],
		queryFn: () => fetchAllPages(page => fetchAdminRolesList({ page, page_size: 200 })),
		staleTime: 5 * 60 * 1000,
	});
}

export function recentNotificationRunsQuery() {
	return queryOptions({
		queryKey: ["notifications", "runs", "latest"],
		queryFn: fetchRecentNotificationRuns,
		staleTime: 30 * 1000,
		refetchInterval: (query) => {
			const isRunning = query.state.data?.some(run => run.status === "RUNNING" || run.status === "QUEUED");
			return isRunning ? 5000 : false;
		},
	});
}
