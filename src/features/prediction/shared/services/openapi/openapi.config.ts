import type {
	OpenApiManualSharesValue,
	OpenApiOperationCode,
	OpenApiPredictionServiceFields,
	PredictionMetricCode,
	PredictionShareSectionValue,
} from "../../model/prediction.form.types";

export const OPENAPI_METRICS = [
	{ key: "value", titleKey: "prediction.metrics.value" },
	{ key: "income", titleKey: "prediction.metrics.income" },
	{ key: "expense", titleKey: "prediction.metrics.expense" },
] as const satisfies ReadonlyArray<{ key: PredictionMetricCode, titleKey: string }>;

export const OPENAPI_OPERATION_SECTIONS = [
	{
		key: "billInquiry",
		apiKey: "bill_inquiry",
		titleKey: "prediction.operations.billInquiry",
		fields: {
			value: "billInquiryValueYear",
			income: "billInquiryIncomeYear",
			expense: "billInquiryExpenseYear",
		},
	},
	{
		key: "receiptRegister",
		apiKey: "receipt_register",
		titleKey: "prediction.operations.receiptRegister",
		fields: {
			value: "receiptRegisterValueYear",
			income: "receiptRegisterIncomeYear",
			expense: "receiptRegisterExpenseYear",
		},
	},
	{
		key: "smsTotal",
		apiKey: "sms_total",
		titleKey: "prediction.operations.smsTotal",
		fields: {
			value: "smsTotalValueYear",
			income: "smsTotalIncomeYear",
			expense: "smsTotalExpenseYear",
		},
	},
	{
		key: "trafficTotal",
		apiKey: "traffic_total",
		titleKey: "prediction.operations.trafficTotal",
		fields: {
			value: "trafficTotalValueYear",
			income: "trafficTotalIncomeYear",
			expense: "trafficTotalExpenseYear",
		},
	},
] as const satisfies ReadonlyArray<{
	key: OpenApiOperationCode
	apiKey: string
	titleKey: string
	fields: Record<PredictionMetricCode, keyof OpenApiPredictionServiceFields>
}>;

function createEmptyShareSection(): PredictionShareSectionValue {
	return {
		mode: "auto",
		selectedCompanyIds: [],
		shares: {},
	};
}

export function createEmptyOpenApiManualShares(): OpenApiManualSharesValue {
	return {
		billInquiry: {
			value: createEmptyShareSection(),
			income: createEmptyShareSection(),
			expense: createEmptyShareSection(),
		},
		receiptRegister: {
			value: createEmptyShareSection(),
			income: createEmptyShareSection(),
			expense: createEmptyShareSection(),
		},
		smsTotal: {
			value: createEmptyShareSection(),
			income: createEmptyShareSection(),
			expense: createEmptyShareSection(),
		},
		trafficTotal: {
			value: createEmptyShareSection(),
			income: createEmptyShareSection(),
			expense: createEmptyShareSection(),
		},
	};
}

export function createEmptyOpenApiFields(): OpenApiPredictionServiceFields {
	return {
		openapiModel: "LEGACY",
		q1Percent: null,
		q2Percent: null,
		q3Percent: null,
		q4Percent: null,
		billInquiryValueYear: null,
		billInquiryIncomeYear: null,
		billInquiryExpenseYear: null,
		receiptRegisterValueYear: null,
		receiptRegisterIncomeYear: null,
		receiptRegisterExpenseYear: null,
		smsTotalValueYear: null,
		smsTotalIncomeYear: null,
		smsTotalExpenseYear: null,
		trafficTotalValueYear: null,
		trafficTotalIncomeYear: null,
		trafficTotalExpenseYear: null,
		manualShares: createEmptyOpenApiManualShares(),
	};
}
