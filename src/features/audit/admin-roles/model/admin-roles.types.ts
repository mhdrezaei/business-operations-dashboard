import type { Paginated } from "#src/api/types";
import type {
	AdminRoleDomainKey,
	AdminRolePermissionAction,
} from "./admin-roles.schema";

export type AdminRoleScope = "global" | "service_admin" | (string & {});

export interface AdminRoleUserRef {
	id: number
	first_name: string
	last_name: string
}

export interface AdminRoleDto {
	id: number
	name: string
	description: string
	is_system: boolean
	scope: AdminRoleScope
	owner_admin: AdminRoleUserRef | null
	created_by_user: AdminRoleUserRef | null
	assigned_users: AdminRoleUserRef[]
	assigned_user_count: number
	allowed_service_ids: number[]
	created_at: string
}

export interface AdminRolesListQuery {
	page?: number
	page_size?: number
	search?: string
	ordering?: string
}

export interface AdminRoleUpsertPayload {
	name: string
	description: string
}

export interface AdminRolePolicyUpsertItem {
	service: number
	domain: "contracts" | "performances" | "predictions" | "company_profile"
	can_view: boolean
	can_create: boolean
	can_update: boolean
	can_delete: boolean
	traffic_company_types?: string[]
	company_visible_cards?: string[]
}

export interface AdminRolePoliciesBulkUpsertPayload {
	items: AdminRolePolicyUpsertItem[]
}

export interface AdminRolePolicyDto {
	id: number
	role: number
	service: number
	service_code: string
	service_name: string
	domain: AdminRoleDomainKey
	can_view: boolean
	can_create: boolean
	can_update: boolean
	can_delete: boolean
	company_visible_cards: string[]
	actor_traffic_company_type_permissions: Record<AdminRolePermissionAction, string[]>
	updated_at: string
	traffic_company_types: string[]
}

export type AdminRolesPaginatedResponse = Paginated<AdminRoleDto>;
export type AdminRolePoliciesPaginatedResponse = Paginated<AdminRolePolicyDto>;
