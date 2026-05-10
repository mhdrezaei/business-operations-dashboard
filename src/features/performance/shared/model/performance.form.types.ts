import type { ServiceDto } from "#src/api/common/common.types";

export type TrafficCompanyType = string;
export type OpenApiContractModel = "legacy" | "package";

export type PerformanceServiceCode = ServiceDto["code"] | "sms-commission" | "sms_commission";

export interface PerformanceFormValues {
	serviceId: number | null
	serviceCode: PerformanceServiceCode | null
	companyId: number | null
	trafficCompanyType: TrafficCompanyType | null
	salesAgentId: number | null
	year: number | null
	month: number | null
	contractId: number | null
	contractModel: OpenApiContractModel | null
	serviceFields: Record<string, unknown>
}
