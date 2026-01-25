import type { ServiceDto } from "#src/api/common/common.types.js";

export type ContractServiceCode = ServiceDto["code"];

export interface FixedStartFields {
	serviceId: number | null // select سرویس
	companyId: number | null
	startYear: number | null
	startMonth: number | null // 1..12
	endYear: number | null
	endMonth: number | null // 1..12
}

export interface FixedEndFields {
	description?: string
	documents: any[]
	// ... فیلدهای ثابت انتها
}

export type ContractFormValues = FixedStartFields
  & FixedEndFields & { serviceFields: Record<string, unknown>, serviceCode: ContractServiceCode | null };
