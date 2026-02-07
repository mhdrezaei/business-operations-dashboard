// api-contract.dto.ts
export interface ApiTier {
	min_inclusive: string
	max_exclusive: string | null
	rate_per_unit: string
}

export interface ApiPricing {
	calculation_type: "FIXED" | "TIER_SINGLE" | "TIER_BLENDED"
	tiers?: ApiTier[]
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
