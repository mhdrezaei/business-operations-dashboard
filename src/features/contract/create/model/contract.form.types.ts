import type { ServiceDto } from "#src/api/common/common.types.js";

export type SmsCounterpartyType = "partners" | "gov_ops";

export type ContractServiceCode = ServiceDto["code"];

export interface FixedStartFields {
	serviceId: number | null
	companyId: number | null
	startYear: number | null
	startMonth: number | null
	endYear: number | null
	endMonth: number | null
}

export interface FixedEndFields {
	description?: string
	documents: any[]
	// ... فیلدهای ثابت انتها
}

export interface ContractFormValues {
	serviceId: number | null
	serviceCode: ContractServiceCode | null
	companyId: number | null
	counterpartyType: SmsCounterpartyType | null
	startYear: number | null
	startMonth: number | null
	endYear: number | null
	endMonth: number | null
	description?: string
	documents: any[]
	serviceFields: Record<string, unknown>
}
