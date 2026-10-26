import type { AppRouteRecordRaw } from "#src/router/types";

export interface AuthType {
	access: string
	refresh: string
}

// ─── Permission Action Types ───────────────────────────────────────────────────

/** Standard CRUD actions shared across all domains and admin sections */
export type CrudAction = "view" | "create" | "update" | "delete";

/** Contract-specific extended actions beyond standard CRUD */
export type ContractExtraAction = "sign" | "business_approve";

/**
 * All possible permission actions for a (service, domain) pair.
 * Standard CRUD applies to all domains; `sign` and `business_approve`
 * only appear in the `contracts` domain.
 */
export type DomainPermissionAction = CrudAction | ContractExtraAction;

// ─── Admin Types ───────────────────────────────────────────────────────────────

/**
 * Administrative role hierarchy from `/audit/access/` → `role` field.
 * Ordered by privilege (highest first):
 * `superuser` → `staff_admin` → `service_admin` → `deputy_service_admin` → `user`
 */
export type AdminRole = "superuser" | "staff_admin" | "service_admin" | "deputy_service_admin" | "user";

/** Backend admin panel sections from `admin_sections` / `admin_section_actions` */
export type AdminSection = "users" | "roles" | "service_admins" | "logs" | "notification_rules";

export type TrafficCompanyType = string;

// ─── Domain Permission ─────────────────────────────────────────────────────────

/**
 * Resolved boolean permission map for a single (service, domain) pair.
 * CRUD fields are always present. Contract-specific extras (`sign`,
 * `business_approve`) default to `false` for non-contracts domains.
 */
export interface DomainPermission {
	view: boolean
	create: boolean
	update: boolean
	delete: boolean
	/** Contract-only: department-level sign-off approval (is_signed) */
	sign: boolean
	/** Contract-only: business/commercial approval */
	business_approve: boolean
}

/** @deprecated Use {@link DomainPermission} instead */
export type DomainCrudPermission = DomainPermission;

/**
 * Raw permission data from the backend for a single (service, domain) pair.
 * - Array of action strings (standard from `/audit/access/`) — e.g. `["view", "create", "sign"]`
 * - Pre-resolved {@link DomainPermission} object — legacy/internal format
 */
export type DomainPermissionResponse = DomainPermission | DomainPermissionAction[];

/** @deprecated Use {@link DomainPermissionResponse} instead */
export type DomainCrudPermissionResponse = DomainPermissionResponse;
export interface CompanyTypeOption {
	key: string
	value: string
}

export type TrafficCompanyTypePermission = Partial<
	Record<string, Partial<Record<DomainPermissionAction, TrafficCompanyType[]>>>
>;

export type CompanyTypePermissionResponseItem = Record<string, string>;
export type CompanyTypePermission = Partial<
	Record<string, Partial<Record<DomainPermissionAction, CompanyTypePermissionResponseItem[]>>>
>;

export interface AccessServiceType {
	id: number
	code: string
	name: string
	permissions: Record<string, DomainCrudPermissionResponse>
	traffic_company_type_permissions?: TrafficCompanyTypePermission | null
	company_type_permissions?: CompanyTypePermission | null
}

export interface PortalViewerType {
	id: number
	name: string
	assigned: boolean
}

export interface AuditAccessType {
	domains: string[]
	company_visible_cards: string[]
	services: AccessServiceType[]
	roles: string[]
	role?: AdminRole | string | null
	admin_role?: string | null
	is_staff?: boolean
	is_service_admin?: boolean
	is_deputy_service_admin?: boolean
	service_admin_service_ids?: number[]
	admin_sections?: string[]
	admin_section_actions?: Record<string, CrudAction[]>
	deputy_service_admin_id?: number | null
	/** The backend sends the granted capabilities as a string list (e.g. `["create_users"]`). */
	deputy_permissions?: DeputyPermissionsType | string[]
	can_manage_users?: boolean
	can_manage_roles?: boolean
	portal_viewer?: PortalViewerType | null
}

export interface DeputyPermissionsType {
	can_create_users: boolean
	can_create_roles: boolean
	can_edit_users: boolean
	can_assign_roles: boolean
	can_manage_policies: boolean
}

export interface UserInfoType {
	id: string
	avatar: string
	is_staff: boolean
	is_superuser: boolean
	first_name?: string
	last_name?: string
	username: string
	email: string
	phoneNumber: string
	description: string
	roles: Array<string>
	role?: AdminRole | string | null
	admin_role?: string | null
	domains?: string[]
	company_visible_cards?: string[]
	services?: AccessServiceType[]
	is_service_admin?: boolean
	is_deputy_service_admin?: boolean
	service_admin_service_ids?: number[]
	admin_sections?: string[]
	admin_section_actions?: Record<string, DomainPermissionAction[]>
	deputy_service_admin_id?: number | null
	deputy_permissions?: DeputyPermissionsType
	can_manage_users?: boolean
	can_manage_roles?: boolean
	portal_viewer?: PortalViewerType | null
	// مسیرها می توانند اینجا به صورت پویا اضافه شوند
	menus?: AppRouteRecordRaw[]
}

export interface AuthListProps {
	label: string
	name: string
	auth: string[]
}
