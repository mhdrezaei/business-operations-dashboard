import type { Paginated } from "#src/api/types";

export type NotificationRuleCode = "CONTRACT_EXPIRY" | "CONTRACT_EXPIRY_SMS";
export type NotificationRuleChannel = "IN_APP" | "SMS";
export type NotificationRecipientTargetType = "USER" | "ROLE";

export interface NotificationRuleRecipientDto {
	id?: number
	target_type: NotificationRecipientTargetType
	user_id: number | null
	role_id: number | null
	created_at?: string
}

export type NotificationRulePayloadTemplate = Record<string, unknown>;

export interface NotificationRuleDto {
	id: number
	code: NotificationRuleCode | (string & {})
	name: string
	is_active: boolean
	days_before_end: number[]
	channels: Array<NotificationRuleChannel | (string & {})>
	payload_template: NotificationRulePayloadTemplate
	recipients: NotificationRuleRecipientDto[]
	created_at: string
	updated_at: string
	service_names: string[]
}

export interface NotificationRulesListQuery {
	page?: number
	page_size?: number
	search?: string
	ordering?: string
	code?: NotificationRuleCode
	is_active?: boolean
}

export interface NotificationRuleUpsertPayload {
	code: NotificationRuleCode
	name: string
	is_active: boolean
	service_names: string[]
	days_before_end: number[]
	channels: NotificationRuleChannel[]
	payload_template: NotificationRulePayloadTemplate
	recipients: NotificationRuleRecipientDto[]
}

export interface NotificationRunMeta {
	today?: string
	task_id?: string
	created_events?: number
	fanout_event_ids?: number[]
	created_event_ids?: number[]
	scanned_contracts?: number
	[key: string]: unknown
}

export interface NotificationRunDto {
	id: number
	job_name: string
	started_at: string
	finished_at: string | null
	status: string
	meta: NotificationRunMeta | null
}

export type NotificationRulesPaginatedResponse = Paginated<NotificationRuleDto>;
