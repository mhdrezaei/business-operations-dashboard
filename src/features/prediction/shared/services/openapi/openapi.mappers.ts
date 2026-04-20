import type { OpenApiPredictionPayload, OpenApiPredictionYearDto } from "../../../api/predictions.api";
import type {
	OpenApiManualSharesValue,
	OpenApiPredictionServiceFields,
	PredictionFormValues,
	PredictionShareMode,
	PredictionShareSectionValue,
} from "../../model/prediction.form.types";
import { toNullableNumber, toNumberOrZero } from "../../model/prediction.helpers";
import { createEmptyOpenApiFields, createEmptyOpenApiManualShares, OPENAPI_METRICS, OPENAPI_OPERATION_SECTIONS } from "./openapi.config";

function isShareMode(value: unknown): value is PredictionShareMode {
	return value === "auto" || value === "manual";
}

function normalizeShareSection(value: unknown): PredictionShareSectionValue {
	const fallback = {
		mode: "auto",
		selectedCompanyIds: [],
		shares: {},
	} satisfies PredictionShareSectionValue;

	if (!value || typeof value !== "object")
		return fallback;

	const raw = value as Record<string, unknown>;
	const selectedCompanyIds = Array.isArray(raw.selectedCompanyIds)
		? raw.selectedCompanyIds
			.map(item => Number(item))
			.filter(item => Number.isInteger(item) && item > 0)
		: [];

	const shares = raw.shares && typeof raw.shares === "object"
		? Object.fromEntries(
			Object.entries(raw.shares as Record<string, unknown>).map(([key, amount]) => [key, toNullableNumber(amount)]),
		)
		: {};

	return {
		mode: isShareMode(raw.mode) ? raw.mode : "auto",
		selectedCompanyIds,
		shares,
	};
}

function normalizeManualShares(value: unknown): OpenApiManualSharesValue {
	const fallback = createEmptyOpenApiManualShares();
	if (!value || typeof value !== "object")
		return fallback;

	const raw = value as Record<string, unknown>;
	return {
		billInquiry: {
			value: normalizeShareSection(raw.billInquiry && (raw.billInquiry as Record<string, unknown>).value),
			income: normalizeShareSection(raw.billInquiry && (raw.billInquiry as Record<string, unknown>).income),
			expense: normalizeShareSection(raw.billInquiry && (raw.billInquiry as Record<string, unknown>).expense),
		},
		receiptRegister: {
			value: normalizeShareSection(raw.receiptRegister && (raw.receiptRegister as Record<string, unknown>).value),
			income: normalizeShareSection(raw.receiptRegister && (raw.receiptRegister as Record<string, unknown>).income),
			expense: normalizeShareSection(raw.receiptRegister && (raw.receiptRegister as Record<string, unknown>).expense),
		},
		smsTotal: {
			value: normalizeShareSection(raw.smsTotal && (raw.smsTotal as Record<string, unknown>).value),
			income: normalizeShareSection(raw.smsTotal && (raw.smsTotal as Record<string, unknown>).income),
			expense: normalizeShareSection(raw.smsTotal && (raw.smsTotal as Record<string, unknown>).expense),
		},
		trafficTotal: {
			value: normalizeShareSection(raw.trafficTotal && (raw.trafficTotal as Record<string, unknown>).value),
			income: normalizeShareSection(raw.trafficTotal && (raw.trafficTotal as Record<string, unknown>).income),
			expense: normalizeShareSection(raw.trafficTotal && (raw.trafficTotal as Record<string, unknown>).expense),
		},
	};
}

export function dtoToOpenApiPredictionForm(record: OpenApiPredictionYearDto): Partial<PredictionFormValues> {
	const empty = createEmptyOpenApiFields();

	return {
		recordId: record.id,
		fiscalYear: record.fiscal_year,
		note: record.note ?? "",
		serviceFields: {
			...empty,
			openapiModel: "LEGACY",
			q1Percent: toNullableNumber(record.q1_percent),
			q2Percent: toNullableNumber(record.q2_percent),
			q3Percent: toNullableNumber(record.q3_percent),
			q4Percent: toNullableNumber(record.q4_percent),
			billInquiryValueYear: toNullableNumber(record.bill_inquiry_value_year),
			billInquiryIncomeYear: toNullableNumber(record.bill_inquiry_income_year),
			billInquiryExpenseYear: toNullableNumber(record.bill_inquiry_expense_year),
			receiptRegisterValueYear: toNullableNumber(record.receipt_register_value_year),
			receiptRegisterIncomeYear: toNullableNumber(record.receipt_register_income_year),
			receiptRegisterExpenseYear: toNullableNumber(record.receipt_register_expense_year),
			smsTotalValueYear: toNullableNumber(record.sms_total_value_year),
			smsTotalIncomeYear: toNullableNumber(record.sms_total_income_year),
			smsTotalExpenseYear: toNullableNumber(record.sms_total_expense_year),
			trafficTotalValueYear: toNullableNumber(record.traffic_total_value_year),
			trafficTotalIncomeYear: toNullableNumber(record.traffic_total_income_year),
			trafficTotalExpenseYear: toNullableNumber(record.traffic_total_expense_year),
			manualShares: normalizeManualShares(record.manual_shares),
		} satisfies OpenApiPredictionServiceFields,
	};
}

function buildSharePayload(
	manualShares: OpenApiManualSharesValue,
	allCompanyIds: number[],
) {
	const normalizedCompanyIds = Array.from(new Set(allCompanyIds))
		.filter(companyId => Number.isInteger(companyId) && companyId > 0);

	return Object.fromEntries(
		OPENAPI_OPERATION_SECTIONS.map(section => [
			section.apiKey,
			Object.fromEntries(
				OPENAPI_METRICS.map((metric) => {
					const state = manualShares[section.key][metric.key];
					const selected = new Set(state.selectedCompanyIds.map(String));
					const shares = Object.fromEntries(
						normalizedCompanyIds.map((companyId) => {
							const companyKey = String(companyId);
							const amount = selected.has(companyKey)
								? toNumberOrZero(state.shares[companyKey])
								: 0;
							return [companyKey, amount];
						}),
					);

					return [
						metric.key,
						{
							mode: state.mode,
							shares,
						},
					];
				}),
			),
		]),
	);
}

export function openApiPredictionFormToPayload(
	values: PredictionFormValues,
	allCompanyIds: number[],
): OpenApiPredictionPayload {
	const fields = {
		...createEmptyOpenApiFields(),
		...(values.serviceFields as Partial<OpenApiPredictionServiceFields>),
	};

	return {
		service: Number(values.serviceId),
		fiscal_year: Number(values.fiscalYear),
		openapi_model: fields.openapiModel,
		bill_inquiry_value_year: toNumberOrZero(fields.billInquiryValueYear),
		bill_inquiry_income_year: toNumberOrZero(fields.billInquiryIncomeYear),
		bill_inquiry_expense_year: toNumberOrZero(fields.billInquiryExpenseYear),
		receipt_register_value_year: toNumberOrZero(fields.receiptRegisterValueYear),
		receipt_register_income_year: toNumberOrZero(fields.receiptRegisterIncomeYear),
		receipt_register_expense_year: toNumberOrZero(fields.receiptRegisterExpenseYear),
		sms_total_value_year: toNumberOrZero(fields.smsTotalValueYear),
		sms_total_income_year: toNumberOrZero(fields.smsTotalIncomeYear),
		sms_total_expense_year: toNumberOrZero(fields.smsTotalExpenseYear),
		traffic_total_value_year: toNumberOrZero(fields.trafficTotalValueYear),
		traffic_total_income_year: toNumberOrZero(fields.trafficTotalIncomeYear),
		traffic_total_expense_year: toNumberOrZero(fields.trafficTotalExpenseYear),
		q1_percent: Number(fields.q1Percent ?? 0),
		q2_percent: Number(fields.q2Percent ?? 0),
		q3_percent: Number(fields.q3Percent ?? 0),
		q4_percent: Number(fields.q4Percent ?? 0),
		manual_shares: buildSharePayload(fields.manualShares, allCompanyIds),
		note: String(values.note ?? ""),
	};
}

export function findOpenApiPredictionByFiscalYear(
	records: OpenApiPredictionYearDto[],
	fiscalYear: number | null | undefined,
) {
	if (!fiscalYear)
		return null;

	return records.find(record => Number(record.fiscal_year) === Number(fiscalYear)) ?? null;
}
