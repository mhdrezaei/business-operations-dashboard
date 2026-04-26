import type {
	AdminRoleDto,
	AdminRolePoliciesBulkUpsertPayload,
	AdminRolePoliciesPaginatedResponse,
	AdminRolesListQuery,
	AdminRolesPaginatedResponse,
	AdminRoleUpsertPayload,
} from "../model/admin-roles.types";

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

export function fetchAdminRolePolicies(roleId: number) {
	return request
		.get(`${POLICIES_BASE}/`, {
			searchParams: {
				role: roleId,
				page_size: 500,
			},
		})
		.json<AdminRolePoliciesPaginatedResponse>();
}

export function fetchBulkUpsertAdminRolePolicies(roleId: number, payload: AdminRolePoliciesBulkUpsertPayload) {
	return request
		.post(`${POLICIES_BASE}/bulk-upsert/${roleId}/`, { json: payload })
		.json();
}
