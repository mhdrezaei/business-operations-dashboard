import { fetchServices } from "#src/api/common/common.api";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { fetchAdminRolesList, fetchAdminUsersList } from "../api/admin-users.api";

export function adminRolesQuery() {
	return {
		queryKey: ["audit", "admin", "roles"],
		queryFn: () => fetchAdminRolesList({ page: 1, page_size: 100 }),
		staleTime: 60_000,
	};
}

/** نام کاربران برای نمایش «ادمین والد» (BE حداکثر ۲۰۰ ردیف در هر صفحه می‌دهد). */
export function adminUsersLookupQuery() {
	return {
		queryKey: ["audit", "admin", "users-lookup"],
		queryFn: () => fetchAdminUsersList({ page: 1, page_size: 200 }),
		staleTime: 60_000,
	};
}

/** Service names by id (shared "common/services" cache); ids stay as the fallback label. */
export function useServiceLabel() {
	const { data } = useQuery({ queryKey: ["common", "services"], queryFn: fetchServices, staleTime: 5 * 60 * 1000 });
	const nameById = useMemo(() => new Map((data?.results ?? []).map(service => [Number(service.id), service.name])), [data]);
	return useCallback((serviceId: number) => nameById.get(Number(serviceId)) ?? `#${serviceId}`, [nameById]);
}
