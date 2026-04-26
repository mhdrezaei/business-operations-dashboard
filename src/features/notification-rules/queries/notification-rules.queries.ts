import { fetchServices } from "#src/api/common/common.api";
import { fetchAdminRolesList } from "#src/features/audit/admin-roles/api/admin-roles.api";
import { fetchAdminUsersList } from "#src/features/audit/admin-users/api/admin-users.api";
import { queryOptions } from "@tanstack/react-query";
import { fetchLatestNotificationRun } from "../api/notification-rules.api";

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
		queryFn: () => fetchAdminUsersList({ page: 1, page_size: 500 }),
		staleTime: 5 * 60 * 1000,
	});
}

export function notificationRuleRolesQuery() {
	return queryOptions({
		queryKey: ["audit", "admin-roles", "notification-rules-options"],
		queryFn: () => fetchAdminRolesList({ page: 1, page_size: 500 }),
		staleTime: 5 * 60 * 1000,
	});
}

export function latestNotificationRunQuery() {
	return queryOptions({
		queryKey: ["notifications", "runs", "latest"],
		queryFn: fetchLatestNotificationRun,
		staleTime: 30 * 1000,
	});
}
