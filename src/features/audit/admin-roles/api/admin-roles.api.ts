import type {
	AdminRoleDto,
	AdminRolePoliciesBulkUpsertPayload,
	AdminRolePoliciesPaginatedResponse,
	AdminRolesListQuery,
	AdminRolesPaginatedResponse,
	AdminRoleUpsertPayload,
} from "../model/admin-roles.types";

import { fetchAllPages } from "#src/api/fetch-all-pages";
import { request } from "#src/utils/request";

const BASE = "audit/admin/roles";
const POLICIES_BASE = "audit/admin/policies";

export function fetchAdminRolesList(query: AdminRolesListQuery) {
	return request
		.get(`${BASE}/`, { searchParams: query as any })
		.json<AdminRolesPaginatedResponse>();
}

export function fetchCreateAdminRole(payload: AdminRoleUpsertPayload) {
	return request
		.post(`${BASE}/`, { json: payload })
		.json<AdminRoleDto>();
}

export function fetchUpdateAdminRole(id: number, payload: AdminRoleUpsertPayload) {
	return request
		.put(`${BASE}/${id}/`, { json: payload })
		.json<AdminRoleDto>();
}

export function fetchDeleteAdminRole(id: number) {
	return request.delete(`${BASE}/${id}/`);
}

/** Every policy of the role (the backend ignores `page_size` and returns 20 per page). */
export async function fetchAdminRolePolicies(roleId: number) {
	const { results } = await fetchAllPages(page => request
		.get(`${POLICIES_BASE}/`, { searchParams: { role: roleId, page } })
		.json<AdminRolePoliciesPaginatedResponse>());
	return results;
}

export function fetchBulkUpsertAdminRolePolicies(roleId: number, payload: AdminRolePoliciesBulkUpsertPayload) {
	return request
		.post(`${POLICIES_BASE}/bulk-upsert/${roleId}/`, { json: payload })
		.json();
}

export function fetchUpdateAdminRolePolicies(roleId: number, payload: AdminRolePoliciesBulkUpsertPayload) {
	return request
		.put(`${POLICIES_BASE}/bulk-upsert/${roleId}/`, { json: payload })
		.json();
}
