export type CompanyDocumentDocType = | "OFFICIAL_GAZETTE_CHANGES"
  | "REGISTRATION_NOTICE"
  | "ARTICLES_OF_ASSOCIATION"
  | "REPRESENTATIVE_LETTER"
  | "LOGO"
  | "OTHER";

export type CompanyDocumentVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface CompanyDocumentDto {
	id: number
	company: number
	doc_type: CompanyDocumentDocType
	file: string
	original_filename: string | null
	mime_type: string | null
	size: number | null
	verification_status: CompanyDocumentVerificationStatus
	valid_from: string | null
	valid_until: string | null
	created_at: string
	updated_at: string
}

export interface Paginated<T> {
	count: number
	next: string | null
	previous: string | null
	results: T[]
}

export interface CompanyDocumentFormValues {
	doc_type: CompanyDocumentDocType | null
	verification_status: CompanyDocumentVerificationStatus | null
	valid_from: string | null
	valid_until: string | null
	file: File | null
}
