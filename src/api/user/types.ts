import type { AppRouteRecordRaw } from "#src/router/types";

export interface AuthType {
	access: string
	refresh: string
}

export interface UserInfoType {
	id: string
	avatar: string
	is_staff: boolean
	is_superuser: boolean
	username: string
	email: string
	phoneNumber: string
	description: string
	roles: Array<string>
	// مسيرها مي توانند اينجا به صورت پويا اضافه شوند
	menus?: AppRouteRecordRaw[]
}

export interface AuthListProps {
	label: string
	name: string
	auth: string[]
}
