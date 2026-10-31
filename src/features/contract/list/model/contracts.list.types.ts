export interface ContractListUser {
	first_name?: string | null
	last_name?: string | null
}

export type ContractApprovalFilter = "true" | "false" | "pending";

/** Derived «تأیید قرارداد» state (contracts have no rejection). */
export type ContractOfficeApproval = "waiting_business" | "waiting" | "approved";

export interface ContractListItemType {
	id: number

	service_id: number
	company_id: number

	service_name: string
	company_name: string
	company_type?: string | Record<string, string> | null

	addenda_count: number
	signed_addenda_count?: number
	business_approved_addenda_count?: number

	contract_number?: string | null
	is_official?: boolean | null
	is_signed?: boolean | null
	is_business_approved?: boolean | null
	real_signed_at?: string | null
	real_signed_addenda_count?: number
	created_by_user?: ContractListUser | null
	updated_by_user?: ContractListUser | null

	start_jy: number | null
	start_jm: number | null
	end_jy: number | null
	end_jm: number | null

	start_date: string // "YYYY-MM-DD"
	end_date: string // "YYYY-MM-DD" یا ممکن است null باشد (طبق API شما)

	// sms only (the list API does not return it; see resolveSmsParty)
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

	company_type?: string
	is_official?: boolean

	// sms-only
	sms_party?: "vendor" | "client"

	is_business_approved?: ContractApprovalFilter
	office_approval?: ContractOfficeApproval
	real_signed?: boolean

	ordering?: string
}
