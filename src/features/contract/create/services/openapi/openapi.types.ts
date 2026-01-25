export type OpenApiContractModel = "package";
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
