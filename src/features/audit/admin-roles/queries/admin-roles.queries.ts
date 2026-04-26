import type { AdminRoleDomainKey } from "../model/admin-roles.schema";
import { fetchServices } from "#src/api/common/common.api";
import { queryOptions } from "@tanstack/react-query";
import { fetchAdminRolePolicies } from "../api/admin-roles.api";

export function adminRoleServicesQuery() {
	return queryOptions({
		queryKey: ["common", "services"],
		queryFn: fetchServices,
		staleTime: 5 * 60 * 1000,
	});
}

export function adminRoleServicesByDomainQuery(domain: AdminRoleDomainKey) {
	return queryOptions({
		queryKey: ["common", "services", { domain }],
		queryFn: () => fetchServices({ domain }),
		staleTime: 5 * 60 * 1000,
	});
}

export function adminRolePoliciesQuery(roleId: number | null | undefined, enabled = true) {
	return queryOptions({
		queryKey: ["audit", "admin-roles", "policies", { roleId }],
		enabled: enabled && !!roleId,
		queryFn: () => fetchAdminRolePolicies(roleId!),
		staleTime: 30 * 1000,
	});
}
