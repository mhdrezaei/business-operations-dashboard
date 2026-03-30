import type { Paginated } from "#src/api/types";

export interface NotificationInboxQuery {
	page?: number
	page_size?: number
	is_read?: boolean
	channel?: string
}

export interface NotificationInboxDto {
	id?: number | null
	title?: string | null
	message?: string | null
	body?: string | null
	description?: string | null
	is_read?: boolean | null
	read?: boolean | null
	created_at?: string | null
	createdAt?: string | null
	date?: string | null
	type?: string | null
	event_type?: string | null
	channel?: string | null
	read_at?: string | null
	data?: Record<string, unknown> | null
	notification_type?: string | null
	avatar?: string | null
	image?: string | null
	metadata?: Record<string, unknown> | null
	payload?: Record<string, unknown> | null
	[key: string]: unknown
}

export interface NotificationItem {
	id: number
	title: string
	message: string
	isRead: boolean
	createdAt: string
	type: string | null
	avatar: string | null
	raw: NotificationInboxDto
}

export interface NotificationInboxResponse extends Paginated<NotificationItem> {
	unread_count?: number | null
}

export interface NotificationMarkReadPayload {
	ids: number[]
}

export interface NotificationMarkStatePayload extends NotificationMarkReadPayload {
	isRead: boolean
}
