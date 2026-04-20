import type { ServiceDto } from "#src/api/common/common.types";

export type PredictionServiceCode = ServiceDto["code"];
export type PredictionShareMode = "auto" | "manual";
export type PredictionMetricCode = "value" | "income" | "expense";
export type OpenApiPredictionModel = "LEGACY";
export type OpenApiOperationCode = "billInquiry" | "receiptRegister" | "smsTotal" | "trafficTotal";
export type TrafficCompanyType = "CP" | "IXP" | "TCI" | "PREMIUM";
export type TrafficLocationCode = "TEHRAN" | "PROVINCE";
export type TrafficPredictionMetricCode = "value" | "valueReceive" | "income" | "expense";

export interface PredictionCompanyOption {
	label: string
	value: number
}

export interface PredictionShareSectionValue {
	mode: PredictionShareMode
	selectedCompanyIds: number[]
	shares: Record<string, number | null>
}

export type PredictionMetricSharesValue<TMetric extends string> = Record<TMetric, PredictionShareSectionValue>;

export type OpenApiManualSharesValue = Record<
	OpenApiOperationCode,
	Record<PredictionMetricCode, PredictionShareSectionValue>
>;

export type YearlyValueIncomeManualSharesValue = PredictionMetricSharesValue<"value" | "income">;
export type PspManualSharesValue = YearlyValueIncomeManualSharesValue;
export type ShahkarManualSharesValue = YearlyValueIncomeManualSharesValue;
export type SmsManualSharesValue = PredictionMetricSharesValue<"value" | "income" | "expense">;
export type TrafficManualSharesValue = Record<
	TrafficLocationCode,
	Record<TrafficPredictionMetricCode, PredictionShareSectionValue>
>;

export interface OpenApiPredictionServiceFields {
	openapiModel: OpenApiPredictionModel
	q1Percent: number | null
	q2Percent: number | null
	q3Percent: number | null
	q4Percent: number | null
	billInquiryValueYear: number | null
	billInquiryIncomeYear: number | null
	billInquiryExpenseYear: number | null
	receiptRegisterValueYear: number | null
	receiptRegisterIncomeYear: number | null
	receiptRegisterExpenseYear: number | null
	smsTotalValueYear: number | null
	smsTotalIncomeYear: number | null
	smsTotalExpenseYear: number | null
	trafficTotalValueYear: number | null
	trafficTotalIncomeYear: number | null
	trafficTotalExpenseYear: number | null
	manualShares: OpenApiManualSharesValue
}

export interface PspPredictionServiceFields {
	q1Percent: number | null
	q2Percent: number | null
	q3Percent: number | null
	q4Percent: number | null
	valueYear: number | null
	incomeYear: number | null
	manualShares: PspManualSharesValue
}

export type ShahkarPredictionServiceFields = PspPredictionServiceFields;

export interface SmsPredictionServiceFields {
	q1Percent: number | null
	q2Percent: number | null
	q3Percent: number | null
	q4Percent: number | null
	valueYear: number | null
	incomeYear: number | null
	expenseYear: number | null
	priceBuy: number | null
	priceSell: number | null
	manualShares: SmsManualSharesValue
}

export interface TrafficPredictionLocationFormValue {
	location: TrafficLocationCode | null
	valueYear: number | null
	valueReceiveYear: number | null
	incomeYear: number | null
	expenseYear: number | null
}

export interface TrafficPredictionServiceFields {
	companyType: TrafficCompanyType | null
	q1Percent: number | null
	q2Percent: number | null
	q3Percent: number | null
	q4Percent: number | null
	locations: TrafficPredictionLocationFormValue[]
	manualShares: TrafficManualSharesValue
}

export interface PredictionFormValues {
	recordId: number | null
	serviceId: number | null
	serviceCode: PredictionServiceCode | null
	fiscalYear: number | null
	note: string
	serviceFields: Record<string, unknown>
}
