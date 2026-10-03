import type { ContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types";
import { defaultContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types";

export type OpenApiContractModel = "package" | "separated" | "legacy";
export type OpenApiPackageMode = "OR" | "AND";

export interface OpenApiPlan {
	smsMin: number | null
	smsMax: number | null
	smsFixedPrice: number | null
	billPartnerShare: number | null
	billKarashabShare: number | null
	billMin: number | null
	billMax: number | null
	billFixedPrice: number | null
	trafficProfitPercent: number | null
	trafficPartnerSharePercent: number | null
}

export interface OpenApiSeparatedPricing {
	walletChargeDiscountPercent: number | null
	midPeriodBillInquiry: ContractTypeValue
	endPeriodBillInquiry: ContractTypeValue
	connectedReceiptRegister: ContractTypeValue
	connectedKarashabSharePercent: number | null
	connectedPartnerSharePercent: number | null
	disconnectedReceiptRegister: ContractTypeValue
	disconnectedKarashabSharePercent: number | null
	disconnectedPartnerSharePercent: number | null
}

export interface OpenApiServiceFields {
	contractModel: OpenApiContractModel | null
	packageMode?: OpenApiPackageMode | null
	plans?: OpenApiPlan[]
	separatedPricing?: OpenApiSeparatedPricing
	legacyPricing?: {
		paymentRegistration: ContractTypeValue // بهای ثبت وصولی
		billInquiry: ContractTypeValue // بهای استعلام قبض
	}
}

export const defaultOpenApiPlan: OpenApiPlan = {
	smsMin: null,
	smsMax: null,
	smsFixedPrice: null,
	billPartnerShare: null,
	billKarashabShare: null,
	billMin: null,
	billMax: null,
	billFixedPrice: null,
	trafficProfitPercent: null,
	trafficPartnerSharePercent: null,
};

export const defaultLegacyPricing = {
	paymentRegistration: structuredClone(defaultContractTypeValue),
	billInquiry: structuredClone(defaultContractTypeValue),
};

export const defaultSeparatedPricing: OpenApiSeparatedPricing = {
	walletChargeDiscountPercent: null,
	midPeriodBillInquiry: structuredClone(defaultContractTypeValue),
	endPeriodBillInquiry: structuredClone(defaultContractTypeValue),
	connectedReceiptRegister: structuredClone(defaultContractTypeValue),
	connectedKarashabSharePercent: null,
	connectedPartnerSharePercent: null,
	disconnectedReceiptRegister: structuredClone(defaultContractTypeValue),
	disconnectedKarashabSharePercent: null,
	disconnectedPartnerSharePercent: null,
};

export const defaultOpenApiServiceFields: OpenApiServiceFields = {
	contractModel: "legacy",
	legacyPricing: structuredClone(defaultLegacyPricing),
};
