export interface Paginated<T> {
	count: number
	next: string | null
	previous: string | null
	results: T[]
}

export type OwnershipPercentValue = string;

export interface ShareholderDto {
	id: number
	service?: number
	company: number
	full_name: string
	national_id: string
	ownership_percent: OwnershipPercentValue
	note: string
	created_at: string
	updated_at: string
}

export interface ShareholderFormValues {
	full_name: string
	national_id: string
	ownership_percent: string
	note: string
}

export interface ListShareholdersParams {
	company: number
	page?: number
	search?: string
	ordering?: string
}
