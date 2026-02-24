export interface PaginatedResponse<T> {
	count: number
	next: string | null
	previous: string | null
	results: T[]
}

export interface AdminRoleDto {
	id: number
	name: string
	description: string
	is_system: boolean
	created_at: string
}

export interface AdminUserDto {
	id: number
	username: string
	first_name: string
	last_name: string
	email: string
	mobile: string
	national_code: string
	is_active: boolean
	is_staff: boolean
	is_superuser: boolean
	last_login: string | null
	date_joined: string
	roles: any // چون API گفته "string"؛ اگر بعداً آرایه شد اینجا اصلاح کن
}

export interface AdminUsersListQuery {
	page?: number
	page_size?: number
	search?: string
	ordering?: string
}

export interface AdminUserUpsertPayload {
	username: string
	first_name: string
	last_name: string
	email: string
	mobile: string
	national_code: string
	is_active: boolean
	is_staff: boolean
	is_superuser: boolean
	password?: string
}

export interface AdminUserSetRolesPayload {
	role_ids: number[]
}
