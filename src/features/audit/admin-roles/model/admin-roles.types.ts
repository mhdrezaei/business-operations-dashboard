import type { Paginated } from "#src/api/types";
import type {
	AdminRoleDomainKey,
	AdminRolePermissionAction,
} from "./admin-roles.schema";

/** Domains a policy row can belong to; the editor only exposes {@link AdminRoleDomainKey}, `contract_template` is carried through. */
export type AdminRolePolicyDomain = AdminRoleDomainKey | "contract_template";

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
	domain: AdminRolePolicyDomain
	can_view: boolean
	can_create: boolean
	can_update: boolean
	can_delete: boolean
	can_sign: boolean
	can_business_approve: boolean
	/** Required by the backend for services scoped by company type (traffic, sms, psp, telecom_frame, sales_agency). */
	company_types?: string[]
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
	domain: AdminRolePolicyDomain
	can_view: boolean
	can_create: boolean
	can_update: boolean
	can_delete: boolean
	can_sign: boolean
	can_business_approve: boolean
	company_visible_cards: string[]
	company_types: string[]
	actor_company_type_permissions: Record<AdminRolePermissionAction, string[]> | null
	updated_at: string
}

export type AdminRolesPaginatedResponse = Paginated<AdminRoleDto>;
export type AdminRolePoliciesPaginatedResponse = Paginated<AdminRolePolicyDto>;
