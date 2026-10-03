import type { ContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types";
import { defaultContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types";

export type OpenApiContractModel = "separated" | "legacy";

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
	separatedPricing?: OpenApiSeparatedPricing
	legacyPricing?: {
		paymentRegistration: ContractTypeValue // بهای ثبت وصولی
		billInquiry: ContractTypeValue // بهای استعلام قبض
	}
}

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
