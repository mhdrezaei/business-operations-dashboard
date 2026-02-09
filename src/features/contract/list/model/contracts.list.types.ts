export interface ContractListItemType {
	id: number

	service_id: number
	company_id: number

	service_name: string
	company_name: string

	addenda_count: number

	start_jy: number | null
	start_jm: number | null
	end_jy: number | null
	end_jm: number | null

	start_date: string // "YYYY-MM-DD"
	end_date: string // "YYYY-MM-DD" یا ممکن است null باشد (طبق API شما)

	// traffic only
	traffic_company_type?: "TCI" | "IXP" | "CP" | "PREMIUM" | null
	traffic_is_official?: boolean | null

	// sms only
	sms_party?: "vendor" | "client" | null
}

export interface PaginatedResult<T> {
	count: number
	next: string | null
	previous: string | null
	results: T[]
}

/**
 * پارامترهای /contracts/list طبق Swagger
 */
export interface ContractsListQuery {
	page?: number
	page_size?: number
	search?: string

	service_id?: number
	company_id?: number

	// traffic-only
	company_type?: "TCI" | "IXP" | "CP" | "PREMIUM"
	is_official?: boolean

	// sms-only
	sms_party?: "vendor" | "client"

	ordering?: string
}
