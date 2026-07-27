export interface TemplateListItemType {
	id: number
	name: string
	service: string
	service_name: string
	variant: string
	company_type: string
	document_kind: string
	header: string
	font_ids: number[]
	created_at: string
	updated_at: string
	created_by: number
	created_by_name: string
	updated_by: number
	updated_by_name: string
}

export interface TemplatesListQueryParams {
	page?: number
	page_size?: number
	search?: string
	ordering?: string
}

export interface PaginatedResponse<T> {
	count: number
	next: string | null
	previous: string | null
	results: T[]
}
