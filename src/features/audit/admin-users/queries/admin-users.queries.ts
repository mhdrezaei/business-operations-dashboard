import { fetchAdminRolesList } from "../api/admin-users.api";

export function adminRolesQuery() {
	return {
		queryKey: ["audit", "admin", "roles"],
		queryFn: () => fetchAdminRolesList({ page: 1, page_size: 100 }),
		staleTime: 60_000,
	};
}
