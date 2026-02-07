export interface ServiceDto {
	id: number
	code: "commercial" | "openapi" | "psp" | "shahkar" | "sms" | "traffic" | (string & {})
	name: string
	created_at: string
	updated_at: string
}

export interface CompanyDto {
	id: number
	name: string
	service: number
	company_type: string | null
	created_by_id: number | null
	updated_by_id: number | null
	created_at: string
	updated_at: string
}
