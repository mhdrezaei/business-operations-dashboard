import type { ContractTypeValue } from "#src/features/contract/create/components/contract-type/contract-type.types";

export type OpenApiContractModel = "package" | "legacy";
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
	trafficCommissionPercent: number | null // 0..100
}

export interface OpenApiServiceFields {
	contractModel: OpenApiContractModel | null // Package (بسته‌ای)
	packageMode: OpenApiPackageMode | null // OR/AND

	plans: OpenApiPlan[]
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

	trafficCommissionPercent: null,
};

export const defaultOpenApiServiceFields: OpenApiServiceFields = {
	contractModel: "package",
	packageMode: "OR",
	plans: [defaultOpenApiPlan],
};

export const defaultContractTypeValue: ContractTypeValue = {
	type: null,
	fixedAmount: null,
	rows: [{ from: null, to: null, fee: null }],
	sections: [{ mode: null, rows: [{ from: null, to: null, fee: null }] }],
};

export const defaultLegacyPricing = {
	paymentRegistration: structuredClone(defaultContractTypeValue),
	billInquiry: structuredClone(defaultContractTypeValue),
};
