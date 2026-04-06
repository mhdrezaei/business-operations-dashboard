// api-contract.dto.ts
export interface ApiTier {
	min_inclusive: string | null
	max_exclusive: string | null
	rate_per_unit: string
}

export interface ApiPricing {
	calculation_type: "FLAT" | "TIER_SINGLE" | "TIER_PROGRESSIVE" | "TIER_MIXED"
	tiers?: ApiTier[] | {
		segments?: Array<{
			mode: "FIXED" | "PROGRESSIVE" | "SINGLE" | string
			tiers?: ApiTier[]
		}>
	}
}

export interface ApiContractDto {
	id: number
	company: number | null
	service: number
	start_jy: number | null
	start_jm: number | null
	end_jy: number | null
	end_jm: number | null
	note: string
	bill_inquiry: ApiPricing | null
	receipt_register: ApiPricing | null
	package_model: string | null
	addenda: any[]
}
