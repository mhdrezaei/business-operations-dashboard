import type { OpenApiAmountPrefix } from "../../../api/predictions.api";
import type {
	OpenApiAmountField,
	OpenApiManualSharesValue,
	OpenApiOperationCode,
	OpenApiPredictionModel,
	OpenApiPredictionServiceFields,
	PredictionMetricCode,
	PredictionShareSectionValue,
} from "../../model/prediction.form.types";

function capitalize<T extends string>(value: T) {
	return `${value.charAt(0).toUpperCase()}${value.slice(1)}` as Capitalize<T>;
}

export const OPENAPI_METRICS = [
	{ key: "value", titleKey: "prediction.metrics.value" },
	{ key: "income", titleKey: "prediction.metrics.income" },
	{ key: "expense", titleKey: "prediction.metrics.expense" },
] as const satisfies ReadonlyArray<{ key: PredictionMetricCode, titleKey: string }>;

export const OPENAPI_OPERATION_SECTIONS = [
	{
		key: "billInquiry",
		apiKey: "bill_inquiry",
		shareKey: "BILL_INQUIRY",
		titleKey: "prediction.operations.billInquiry",
		model: "LEGACY",
	},
	{
		key: "receiptRegister",
		apiKey: "receipt_register",
		shareKey: "RECEIPT_REGISTER",
		titleKey: "prediction.operations.receiptRegister",
		model: "LEGACY",
	},
	{
		key: "billInquiryMidterm",
		apiKey: "bill_inquiry_midterm",
		shareKey: "BILL_INQUIRY_MIDTERM",
		titleKey: "prediction.operations.billInquiryMidterm",
		model: "LEGACY_2",
	},
	{
		key: "billInquiryEndterm",
		apiKey: "bill_inquiry_endterm",
		shareKey: "BILL_INQUIRY_ENDTERM",
		titleKey: "prediction.operations.billInquiryEndterm",
		model: "LEGACY_2",
	},
	{
		key: "receiptRegisterConnected",
		apiKey: "receipt_register_connected",
		shareKey: "RECEIPT_REGISTER_CONNECTED",
		titleKey: "prediction.operations.receiptRegisterConnected",
		model: "LEGACY_2",
	},
	{
		key: "receiptRegisterDisconnected",
		apiKey: "receipt_register_disconnected",
		shareKey: "RECEIPT_REGISTER_DISCONNECTED",
		titleKey: "prediction.operations.receiptRegisterDisconnected",
		model: "LEGACY_2",
	},
] as const satisfies ReadonlyArray<{
	key: OpenApiOperationCode
	apiKey: OpenApiAmountPrefix
	shareKey: string
	titleKey: string
	model: OpenApiPredictionModel
}>;

export const OPENAPI_MODEL_OPTIONS = [
	{
		labelKey: "prediction.openapi.models.legacy",
		value: "LEGACY",
	},
	{
		labelKey: "prediction.openapi.models.legacy2",
		value: "LEGACY_2",
	},
] as const satisfies ReadonlyArray<{
	labelKey: string
	value: OpenApiPredictionModel
}>;

/** The backend no longer accepts PACKAGE on write, so it is only offered while a stored PACKAGE record is open. */
export const OPENAPI_PACKAGE_MODEL_OPTION = {
	labelKey: "prediction.openapi.models.package",
	value: "PACKAGE",
} as const satisfies { labelKey: string, value: OpenApiPredictionModel };

export function getOpenApiAmountField(
	operation: OpenApiOperationCode,
	metric: PredictionMetricCode,
) {
	return `${operation}${capitalize(metric)}Year` as OpenApiAmountField;
}

export function getOpenApiOperationSections(model: OpenApiPredictionModel) {
	// PACKAGE shares the bill-inquiry totals with LEGACY; its other totals are backend-owned (see packageExtras)
	const sectionModel = model === "PACKAGE" ? "LEGACY" : model;
	return OPENAPI_OPERATION_SECTIONS.filter(section =>
		section.model === sectionModel && (model !== "PACKAGE" || section.key === "billInquiry"));
}

function createEmptyShareSection(): PredictionShareSectionValue {
	return {
		mode: "auto",
		selectedCompanyIds: [],
		shares: {},
	};
}

export function createEmptyOpenApiManualShares(): OpenApiManualSharesValue {
	return Object.fromEntries(
		OPENAPI_OPERATION_SECTIONS.map(section => [
			section.key,
			{
				value: createEmptyShareSection(),
				income: createEmptyShareSection(),
				expense: createEmptyShareSection(),
			},
		]),
	) as OpenApiManualSharesValue;
}

export function createEmptyOpenApiFields(): OpenApiPredictionServiceFields {
	return {
		openapiModel: "LEGACY",
		q1Percent: null,
		q2Percent: null,
		q3Percent: null,
		q4Percent: null,
		...Object.fromEntries(
			OPENAPI_OPERATION_SECTIONS.flatMap(section =>
				OPENAPI_METRICS.map(metric => [getOpenApiAmountField(section.key, metric.key), null] as const),
			),
		) as Record<OpenApiAmountField, null>,
		manualShares: createEmptyOpenApiManualShares(),
	};
}
