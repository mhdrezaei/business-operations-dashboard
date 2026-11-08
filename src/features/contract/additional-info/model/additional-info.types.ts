export type GuaranteeType
	= | "CHECK"
	  | "PROMISSORY_NOTE"
	  | "BANK_GUARANTEE"
	  | "DEPOSIT_RECEIPT";

export const GUARANTEE_TYPES: GuaranteeType[] = [
	"CHECK",
	"PROMISSORY_NOTE",
	"BANK_GUARANTEE",
	"DEPOSIT_RECEIPT",
];

export const GUARANTEE_TYPE_LABELS: Record<GuaranteeType, string> = {
	CHECK: "چک صیادی",
	PROMISSORY_NOTE: "سفته",
	BANK_GUARANTEE: "ضمانت‌نامه بانکی",
	DEPOSIT_RECEIPT: "فیش واریزی",
};

export type FieldRenderMode = "text" | "number" | "money" | "percentage" | "list";

export interface CatalogFieldOption {
	label: string
	value: string | number
}

export interface CatalogField {
	key: string
	label: string
	render_mode: FieldRenderMode
	options?: CatalogFieldOption[]
	required?: boolean
	help_text?: string
	[key: string]: unknown
}

export interface GuaranteeCatalogItem {
	guarantee_type: GuaranteeType
	guarantee_type_label: string
	fields: CatalogField[]
}

export interface GuaranteeRecord {
	id: number
	base_contract: number
	service?: number
	addendum_group_id?: string | null
	addendum_service?: string | null
	issue_jy: number
	issue_jm: number
	issue_jd: number
	issue_date?: string
	return_days_after_termination: number
	return_date?: string | null
	note?: string
	guarantee_type: GuaranteeType
	guarantee_type_label: string
	rendered_text?: string
	created_at?: string
	created_by?: number
	updated_at?: string
	updated_by?: number

	// CHECK
	check_number?: string
	issuing_bank?: string
	bank_branch?: string
	branch_code?: string
	guarantee_percent?: string | number
	amount_rial?: string | number
	amount_words?: string

	// PROMISSORY_NOTE
	notes_count?: number
	notes_numbers?: string[]
	total_amount_rial?: string | number
	total_amount_words?: string

	// BANK_GUARANTEE
	min_validity_period?: number

	// DEPOSIT_RECEIPT
	receipt_number?: string
	receipt_jy?: number
	receipt_jm?: number
	receipt_jd?: number
	receipt_date?: string
	equivalent_months?: number

	[key: string]: unknown
}

export interface GuaranteesListQuery {
	type: GuaranteeType
	base_contract?: number
	addendum_group_id?: string
}

export interface GuaranteePayload {
	type: GuaranteeType
	base_contract: number
	service: number
	issue_jy: number
	issue_jm: number
	issue_jd: number
	return_days_after_termination: number
	note?: string
	addendum_group_id?: string | null
	addendum_service?: string | null

	// CHECK
	check_number?: string
	issuing_bank?: string
	bank_branch?: string
	branch_code?: string
	guarantee_percent?: string | number
	amount_rial?: string | number
	amount_words?: string

	// PROMISSORY_NOTE
	notes_count?: number
	notes_numbers?: string[]
	total_amount_rial?: string | number
	total_amount_words?: string

	// BANK_GUARANTEE
	min_validity_period?: number

	// DEPOSIT_RECEIPT
	receipt_number?: string
	receipt_jy?: number
	receipt_jm?: number
	receipt_jd?: number
	equivalent_months?: number

	[key: string]: unknown
}

export interface RealEndRecord {
	id: number
	base_contract: number
	real_end_jy: number
	real_end_jm: number
	real_end_jd: number
	real_end_date?: string
}

export interface RealEndPayload {
	base_contract: number
	service: number
	real_end_jy: number
	real_end_jm: number
	real_end_jd: number
}
