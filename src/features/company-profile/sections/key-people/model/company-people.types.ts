export type CompanyPersonRole	= | "BOARD"
  | "CEO"
  | "COMMERCIAL"
  | "CONTRACTS"
  | "FINANCE"
  | "OTHER"
  | "REPRESENTATIVE";

export interface CompanyPersonDto {
	id: number
	company: number
	service: number
	role: CompanyPersonRole
	full_name: string
	national_id: string | null
	title: string | null
	phone: string[] | null
	email: string[] | null
	is_signatory: boolean
	created_at: string
	updated_at: string
}

export interface CompanyPersonContactItem {
	value: string
}

export interface CompanyPersonPayload {
	company: number
	service: number
	role: CompanyPersonRole
	full_name: string
	national_id: string | null
	title: string | null
	phone: string[]
	email: string[]
	is_signatory: boolean
}

export interface ListCompanyPeopleParams {
	company: number
	page?: number
	search?: string
	ordering?: string
	role?: CompanyPersonRole
	is_signatory?: boolean
}

export interface CompanyPersonFormValues {
	role: CompanyPersonRole | null
	full_name: string
	is_signatory: boolean
	national_id: string
	title: string
	phone: CompanyPersonContactItem[]
	email: CompanyPersonContactItem[]
}

export interface Paginated<T> {
	count: number
	next: string | null
	previous: string | null
	results: T[]
}
