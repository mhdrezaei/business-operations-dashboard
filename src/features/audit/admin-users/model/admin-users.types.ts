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

export interface AdminUserSummaryManagedUserDto {
	id: number
	username: string
	first_name: string
	last_name: string
	email: string
}

export interface AdminUserSummaryRoleDto {
	id: number
	name: string
	scope: string
	assigned_user_ids: number[]
	assigned_user_count: number
	allowed_service_ids: number[]
}

export interface AdminUserSummaryDeputyDto {
	deputy_user_id: number
	username: string
	permissions: {
		can_create_users: boolean
		can_create_roles: boolean
		can_edit_users: boolean
		can_assign_roles: boolean
		can_manage_policies: boolean
	}
	created_user_ids: number[]
	owned_roles: AdminUserSummaryRoleDto[]
}

export interface AdminUserServiceAdminSummaryDto {
	admin_user_id: number
	service_admin_service_ids: number[]
	managed_users: AdminUserSummaryManagedUserDto[]
	created_user_ids: number[]
	owned_roles: AdminUserSummaryRoleDto[]
	deputies: AdminUserSummaryDeputyDto[]
}
