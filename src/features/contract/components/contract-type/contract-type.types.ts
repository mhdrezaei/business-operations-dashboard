export type ContractType
	= | "fixed" | "tier_fixed" | "tier_variable" | "tier_blended";

export interface TierRow {
	from: number | null
	to: number | null
	fee: number | null
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
export const defaultContractTypeValue: ContractTypeValue = {
	type: null,
	fixedAmount: null,
	rows: [{ from: null, to: null, fee: null }],
	sections: [{ mode: null, rows: [{ from: null, to: null, fee: null }] }],
};
