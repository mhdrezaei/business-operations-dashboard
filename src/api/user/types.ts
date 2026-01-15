import type { AppRouteRecordRaw } from "#src/router/types";

export interface AuthType {
	token: string
	refreshToken: string
}

export interface UserInfoType {
	id: string
	avatar: string
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
