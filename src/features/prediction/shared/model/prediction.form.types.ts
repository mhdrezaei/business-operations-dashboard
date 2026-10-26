import type { ServiceDto } from "#src/api/common/common.types";

export type PredictionServiceCode = ServiceDto["code"];
export type PredictionSubmitMode = "create_reset" | "create_another" | "create_and_edit";
export type PredictionShareMode = "auto" | "manual";
export type PredictionMetricCode = "value" | "income" | "expense";
export type OpenApiPredictionModel = "LEGACY" | "LEGACY_2" | "PACKAGE";
export type OpenApiOperationCode = "billInquiry" | "receiptRegister" | "billInquiryMidterm" | "billInquiryEndterm" | "receiptRegisterConnected" | "receiptRegisterDisconnected";
export type OpenApiAmountField = `${OpenApiOperationCode}${"Value" | "Income" | "Expense"}Year`;
export type SmsChannelCode
	= | "MCI_FA"	| "MCI_EN" | "IRANCELL_FA" | "IRANCELL_EN" | "OTHER_FA" | "OTHER_EN";
export type CompanyType = string;
export type TrafficCompanyType = CompanyType;
export type TrafficLocationCode = "TEHRAN" | "COUNTY";
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

export type SmsChannelSharesValue = Record<PredictionMetricCode, Record<SmsChannelCode, number | null>>;

export type YearlyValueIncomeManualSharesValue = PredictionMetricSharesValue<"value" | "income">;
export type PspManualSharesValue = YearlyValueIncomeManualSharesValue;
export type ShahkarManualSharesValue = YearlyValueIncomeManualSharesValue;
export type SmsManualSharesValue = PredictionMetricSharesValue<"value" | "income" | "expense">;
export type TrafficManualSharesValue = Record<
	TrafficLocationCode,
	Record<TrafficPredictionMetricCode, PredictionShareSectionValue>
>;

export interface OpenApiPredictionServiceFields extends Record<OpenApiAmountField, number | null> {
	openapiModel: OpenApiPredictionModel
	q1Percent: number | null
	q2Percent: number | null
	q3Percent: number | null
	q4Percent: number | null
	manualShares: OpenApiManualSharesValue
	/** Backend-owned PACKAGE data (SMS/traffic totals, channels) that has no form fields; sent back untouched. */
	packageExtras?: Record<string, unknown>
}

export interface PspPredictionServiceFields {
	companyType?: CompanyType | null
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
	companyType: CompanyType | null
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
	channels: SmsChannelSharesValue
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
