import type {
	AdminRoleDto,
	AdminUserDto,
	AdminUserServiceAdminSummaryDto,
	AdminUserSetRolesPayload,
	AdminUsersListQuery,
	AdminUserUpsertPayload,
	PaginatedResponse,
} from "../model/admin-users.types";
// src/features/audit/admin-users/api/admin-users.api.ts
import { request } from "#src/utils/request/";

const BASE = "audit/admin";

export async function fetchAdminUsersList(query: AdminUsersListQuery) {
	return request
		.get(`${BASE}/users/`, { searchParams: query as any })
		.json<PaginatedResponse<AdminUserDto>>();
}

export async function fetchAdminUserDetail(id: number) {
	return request
		.get(`${BASE}/users/${id}/`)
		.json<AdminUserDto>();
}

export async function fetchCreateAdminUser(payload: AdminUserUpsertPayload) {
	return request
		.post(`${BASE}/users/`, { json: payload })
		.json<AdminUserDto>();
}

export async function fetchUpdateAdminUser(id: number, payload: AdminUserUpsertPayload) {
	return request
		.put(`${BASE}/users/${id}/`, { json: payload })
		.json<AdminUserDto>();
}

export async function fetchDeleteAdminUser(id: number) {
	// اگر بک‌اند body برنمی‌گردونه، همون Response رو برگردون
	return request.delete(`${BASE}/users/${id}/`);
}

export async function fetchEnableAdminUser(id: number) {
	return request.post(`${BASE}/users/${id}/enable/`);
}

export async function fetchDisableAdminUser(id: number) {
	return request.post(`${BASE}/users/${id}/disable/`);
}

export async function fetchAdminRolesList(query?: { page?: number, search?: string, ordering?: string }) {
	return request
		.get(`${BASE}/roles/`, { searchParams: query as any })
		.json<PaginatedResponse<AdminRoleDto>>();
}

export async function fetchSetAdminUserRoles(id: number, payload: AdminUserSetRolesPayload) {
	return request
		.post(`${BASE}/users/${id}/set-roles/`, { json: payload })
		.json<any>();
}

export async function fetchAdminUserServiceAdminSummary(id: number) {
	return request
		.get(`${BASE}/users/${id}/service-admin-summary/`)
		.json<AdminUserServiceAdminSummaryDto>();
}
