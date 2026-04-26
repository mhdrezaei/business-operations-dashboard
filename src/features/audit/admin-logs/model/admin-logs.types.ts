import type { Paginated } from "#src/api/types";

export type AuditLogJsonValue = | string
  | number
  | boolean
  | null
  | AuditLogJsonValue[]
  | AuditLogJsonObject;

export interface AuditLogJsonObject {
	[key: string]: AuditLogJsonValue | undefined
}

export interface AuditLogExtra {
	body?: AuditLogJsonValue
	query_params?: AuditLogJsonValue
	[key: string]: AuditLogJsonValue | undefined
}

export interface AuditLogDto {
	id: number
	created_at: string
	action: string
	actor: number | null
	actor_username?: string | null
	app_label: string
	model_name: string
	object_id: string | number | null
	path: string | null
	method: string | null
	status_code: number | null
	ip_address: string | null
	user_agent: string | null
	changes: AuditLogJsonValue
	extra: AuditLogExtra | null
}

export interface AuditLogsListQuery {
	page?: number
	page_size?: number
	search?: string
	ordering?: string
	action?: string
	method?: string
	status_code?: number
}

export type AuditLogsPaginatedResponse = Paginated<AuditLogDto>;
