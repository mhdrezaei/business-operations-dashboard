export interface Paginated<T> {
	count: number
	next: string | null
	previous: string | null
	results: T[]
}

export type LegalPersonType = "PRIVATE_JOINT_STOCK" | "PUBLIC_JOINT_STOCK" | "LIMITED_LIABILITY";
export type VatStatus = "SUBJECT" | "EXEMPT" | "UNKNOWN";
export type CooperationStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type SettlementTerm = "CASH" | "CREDIT" | "INSTALLMENT";
export type InfoVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface CompanyProfileDto {
	id: number
	company: number
	service: number
	legal_name: string | null
	brand_name: string | null
	national_id: string | null
	tax_national_id: string | null

	registration_number: string | null
	tax_registration_number: string | null
	registration_place: string | null
	registration_date: string | null
	legal_person_type: LegalPersonType | null
	branch_code: string | null

	legal_address: string | null
	postal_code: string | null

	map_address: string | null
	map_latitude: string | null
	map_longitude: string | null

	phone: string | null
	mobile: string | null
	fax: string | null
	email: string | null

	website: string | null

	economic_code: string | null
	tax_file_number: string | null
	vat_status: VatStatus | null
	tax_office: string | null

	cooperation_start_date: string | null
	cooperation_status: CooperationStatus | null

	financial_commitment_cap: string | null
	settlement_term: SettlementTerm | null
	working_hours: string | null

	social_links: string | null

	internal_code: string | null
	internal_note: string | null
	info_verification_status: InfoVerificationStatus | null

	created_at: string
	updated_at: string
}

export interface SocialLinkItem { label: string, url: string }

export interface CompanyInfoFormValues {
	service: number
	company: number
	legal_name: string
	brand_name: string
	national_id: string
	tax_national_id: string
	legal_person_type: LegalPersonType | null

	registration_number: string
	tax_registration_number: string
	registration_place: string
	registration_date: string | null
	branch_code: string

	legal_address: string
	postal_code: string

	map_address: string
	map_latitude: string
	map_longitude: string

	phone: string[]
	mobile: string[]
	fax: string[]
	email: string[]

	website: string

	economic_code: string
	tax_file_number: string
	vat_status: VatStatus | null
	tax_office: string

	cooperation_start_date: string | null
	cooperation_status: CooperationStatus | null

	financial_commitment_cap: string
	settlement_term: SettlementTerm | null
	working_hours: string

	social_links: SocialLinkItem[]

	internal_code: string
	internal_note: string
	info_verification_status: InfoVerificationStatus | null
}
