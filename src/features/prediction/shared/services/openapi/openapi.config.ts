import type {
	OpenApiChannelCode,
	OpenApiChannelSharesValue,
	OpenApiManualSharesValue,
	OpenApiOperationCode,
	OpenApiPredictionModel,
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
		models: ["LEGACY", "PACKAGE"],
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
		models: ["LEGACY"],
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
		models: ["PACKAGE"],
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
		models: ["PACKAGE"],
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
	models: readonly OpenApiPredictionModel[]
	fields: Record<PredictionMetricCode, keyof OpenApiPredictionServiceFields>
}>;

export const OPENAPI_MODEL_OPTIONS = [
	{
		labelKey: "prediction.openapi.models.legacy",
		value: "LEGACY",
	},
	{
		labelKey: "prediction.openapi.models.package",
		value: "PACKAGE",
	},
] as const satisfies ReadonlyArray<{
	labelKey: string
	value: OpenApiPredictionModel
}>;

export const OPENAPI_API_SECTION_KEYS = {
	billInquiry: "BILL_INQUIRY",
	receiptRegister: "RECEIPT_REGISTER",
	smsTotal: "SMS_TOTAL",
	trafficTotal: "TRAFFIC",
} as const satisfies Record<OpenApiOperationCode, string>;

export const OPENAPI_CHANNEL_OPTIONS = [
	{ key: "SMS_MCI_FA", titleKey: "prediction.openapi.channels.smsMciFa" },
	{ key: "SMS_MCI_EN", titleKey: "prediction.openapi.channels.smsMciEn" },
	{ key: "SMS_IRANCELL_FA", titleKey: "prediction.openapi.channels.smsIrancellFa" },
	{ key: "SMS_IRANCELL_EN", titleKey: "prediction.openapi.channels.smsIrancellEn" },
	{ key: "SMS_OTHER_FA", titleKey: "prediction.openapi.channels.smsOtherFa" },
	{ key: "SMS_OTHER_EN", titleKey: "prediction.openapi.channels.smsOtherEn" },
] as const satisfies ReadonlyArray<{
	key: OpenApiChannelCode
	titleKey: string
}>;

export function getOpenApiOperationSections(model: OpenApiPredictionModel) {
	return OPENAPI_OPERATION_SECTIONS.filter(
		section => (section.models as readonly OpenApiPredictionModel[]).includes(model),
	);
}

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

export function createEmptyOpenApiChannelShares(): OpenApiChannelSharesValue {
	return {
		value: Object.fromEntries(
			OPENAPI_CHANNEL_OPTIONS.map(channel => [channel.key, null]),
		) as Record<OpenApiChannelCode, number | null>,
	};
}

export function createEmptyOpenApiFields(
	previous?: Partial<OpenApiPredictionServiceFields> | Record<string, unknown>,
): OpenApiPredictionServiceFields {
	const previousFields = (previous ?? {}) as Partial<OpenApiPredictionServiceFields>;

	return {
		openapiModel: previousFields.openapiModel === "PACKAGE" ? "PACKAGE" : "LEGACY",
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
		channels: createEmptyOpenApiChannelShares(),
	};
}
