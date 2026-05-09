import type { AppRouteRecordRaw } from "#src/router/types";

export interface AuthType {
	access: string
	refresh: string
}

export type DomainPermissionAction = "view" | "create" | "update" | "delete";
export type TrafficCompanyType = string;

export interface DomainCrudPermission {
	view: boolean
	create: boolean
	update: boolean
	delete: boolean
}

export type DomainCrudPermissionResponse = DomainCrudPermission | DomainPermissionAction[];
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
	role?: string | null
	admin_role?: string | null
	is_staff?: boolean
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
	role?: string | null
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
