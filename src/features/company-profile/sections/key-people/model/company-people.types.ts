// src/features/company-profile/sections/key-people/model/company-people.types.ts

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
	role: CompanyPersonRole
	full_name: string
	national_id: string | null
	title: string | null
	phone: string | null
	email: string | null
	is_signatory: boolean
	created_at: string
	updated_at: string
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
	phone: string[] // مثل CompanyInfo
	email: string[] // مثل CompanyInfo
}

// اگر paginated عمومی ندارید:
export interface Paginated<T> {
	count: number
	next: string | null
	previous: string | null
	results: T[]
}
