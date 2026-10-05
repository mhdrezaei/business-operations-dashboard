import type { ContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types";
import { defaultContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types";

export type OpenApiContractModel = "package" | "legacy" | "separated";
export type OpenApiPackageMode = "OR" | "AND";

export interface OpenApiPlan {
	// بخش پیامک
	smsMin: number | null
	smsMax: number | null
	smsFixedPrice: number | null // تومان

	// بخش استعلام قبض
	billPartnerShare: number | null // %
	billKarashabShare: number | null // %
	billMin: number | null
	billMax: number | null
	billFixedPrice: number | null // تومان

	// کارمزد شریک ترافیک
	trafficProfitPercent: number | null // 0..100
	trafficPartnerSharePercent: number | null // 0..100
}

export interface OpenApiServiceFields {
	contractModel: OpenApiContractModel | null
	packageMode: OpenApiPackageMode | null // OR/AND

	plans: OpenApiPlan[]
	separatedPricing?: {
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

export const defaultSeparatedPricing: NonNullable<OpenApiServiceFields["separatedPricing"]> = {
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
	packageMode: null,
	plans: [],
	legacyPricing: structuredClone(defaultLegacyPricing),
};
