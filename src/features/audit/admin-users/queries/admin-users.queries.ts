import { fetchAdminRolesList } from "../api/admin-users.api";

export function adminRolesQuery() {
	return {
		queryKey: ["audit", "admin", "roles"],
		queryFn: () => fetchAdminRolesList({ page: 1 }),
		staleTime: 60_000,
	};
}
