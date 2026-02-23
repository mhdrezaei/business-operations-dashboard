import type { AppRouteRecordRaw } from "#src/router/types";

export interface AuthType {
	access: string
	refresh: string
}

export type DomainPermissionAction = "view" | "create" | "update" | "delete";

export interface DomainCrudPermission {
	view: boolean
	create: boolean
	update: boolean
	delete: boolean
}

export interface AccessServiceType {
	id: number
	code: string
	name: string
	permissions: Record<string, DomainCrudPermission>
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
	portal_viewer?: PortalViewerType | null
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
	domains?: string[]
	company_visible_cards?: string[]
	services?: AccessServiceType[]
	portal_viewer?: PortalViewerType | null
	// مسیرها می توانند اینجا به صورت پویا اضافه شوند
	menus?: AppRouteRecordRaw[]
}

export interface AuthListProps {
	label: string
	name: string
	auth: string[]
}
