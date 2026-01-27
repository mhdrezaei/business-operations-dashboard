export type ContractType
	= | "fixed" | "tier_fixed" | "tier_variable" | "tier_blended";

export interface TierRow {
	from: number | null // از
	to: number | null // تا
	fee: number | null // مقدار فی
}

export type BlendedSectionMode = "fixed" | "variable";

export interface BlendedSection {
	mode: BlendedSectionMode | null
	rows: TierRow[]
}

export interface ContractTypeValue {
	type: ContractType | null

	// ثابت
	fixedAmount: number | null

	// پلکانی ثابت/متغیر
	rows: TierRow[]

	// تلفیقی
	sections: BlendedSection[]
}
