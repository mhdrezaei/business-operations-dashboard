import type { OpenApiPredictionPayload, OpenApiPredictionYearDto } from "../../../api/predictions.api";
import type {
	OpenApiChannelCode,
	OpenApiChannelSharesValue,
	OpenApiManualSharesValue,
	OpenApiOperationCode,
	OpenApiPredictionModel,
	OpenApiPredictionServiceFields,
	PredictionFormValues,
	PredictionShareMode,
	PredictionShareSectionValue,
} from "../../model/prediction.form.types";
import type { PredictionListRow } from "../../model/prediction.list.types";
import i18next from "i18next";
import { formatPredictionNumber, toNullableNumber, toNumberOrZero } from "../../model/prediction.helpers";
import {
	createEmptyOpenApiChannelShares,
	createEmptyOpenApiFields,
	createEmptyOpenApiManualShares,
	getOpenApiOperationSections,
	OPENAPI_API_SECTION_KEYS,
	OPENAPI_CHANNEL_OPTIONS,
	OPENAPI_METRICS,
} from "./openapi.config";

function normalizeOpenApiModel(value: unknown): OpenApiPredictionModel {
	return value === "PACKAGE" ? "PACKAGE" : "LEGACY";
}

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
	const directShares = Object.entries(raw)
		.filter(([, amount]) => amount != null && amount !== "")
		.map(([key, amount]) => [key, toNullableNumber(amount)] as const)
		.filter(([, amount]) => amount != null);

	if (directShares.length > 0 && !("shares" in raw) && !("selectedCompanyIds" in raw)) {
		const shares = Object.fromEntries(directShares);
		const selectedCompanyIds = Object.keys(shares)
			.map(Number)
			.filter(companyId => Number.isInteger(companyId) && companyId > 0);

		return {
			mode: selectedCompanyIds.length > 0 ? "manual" : "auto",
			selectedCompanyIds,
			shares,
		};
	}

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
	const getSectionValue = (operationKey: OpenApiOperationCode) => {
		const apiKey = OPENAPI_API_SECTION_KEYS[operationKey];
		return raw[apiKey] ?? raw[operationKey];
	};

	return {
		billInquiry: {
			value: normalizeShareSection(getSectionValue("billInquiry") && (getSectionValue("billInquiry") as Record<string, unknown>).value),
			income: normalizeShareSection(getSectionValue("billInquiry") && (getSectionValue("billInquiry") as Record<string, unknown>).income),
			expense: normalizeShareSection(getSectionValue("billInquiry") && (getSectionValue("billInquiry") as Record<string, unknown>).expense),
		},
		receiptRegister: {
			value: normalizeShareSection(getSectionValue("receiptRegister") && (getSectionValue("receiptRegister") as Record<string, unknown>).value),
			income: normalizeShareSection(getSectionValue("receiptRegister") && (getSectionValue("receiptRegister") as Record<string, unknown>).income),
			expense: normalizeShareSection(getSectionValue("receiptRegister") && (getSectionValue("receiptRegister") as Record<string, unknown>).expense),
		},
		smsTotal: {
			value: normalizeShareSection(getSectionValue("smsTotal") && (getSectionValue("smsTotal") as Record<string, unknown>).value),
			income: normalizeShareSection(getSectionValue("smsTotal") && (getSectionValue("smsTotal") as Record<string, unknown>).income),
			expense: normalizeShareSection(getSectionValue("smsTotal") && (getSectionValue("smsTotal") as Record<string, unknown>).expense),
		},
		trafficTotal: {
			value: normalizeShareSection(getSectionValue("trafficTotal") && (getSectionValue("trafficTotal") as Record<string, unknown>).value),
			income: normalizeShareSection(getSectionValue("trafficTotal") && (getSectionValue("trafficTotal") as Record<string, unknown>).income),
			expense: normalizeShareSection(getSectionValue("trafficTotal") && (getSectionValue("trafficTotal") as Record<string, unknown>).expense),
		},
	};
}

function normalizeChannelShares(value: unknown): OpenApiChannelSharesValue {
	const fallback = createEmptyOpenApiChannelShares();
	if (!value || typeof value !== "object")
		return fallback;

	const raw = value as Record<string, unknown>;
	const channelSource = raw.channels && typeof raw.channels === "object"
		? (raw.channels as Record<string, unknown>).value
		: raw.value;

	if (!channelSource || typeof channelSource !== "object")
		return fallback;

	return {
		value: Object.fromEntries(
			OPENAPI_CHANNEL_OPTIONS.map(channel => [
				channel.key,
				toNullableNumber((channelSource as Record<string, unknown>)[channel.key]),
			]),
		) as Record<OpenApiChannelCode, number | null>,
	};
}

export function dtoToOpenApiPredictionForm(record: OpenApiPredictionYearDto): Partial<PredictionFormValues> {
	const empty = createEmptyOpenApiFields();
	const openapiModel = normalizeOpenApiModel(record.openapi_model);

	return {
		recordId: record.id,
		fiscalYear: record.fiscal_year,
		note: record.note ?? "",
		serviceFields: {
			...empty,
			openapiModel,
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
			channels: normalizeChannelShares(record.manual_shares),
		} satisfies OpenApiPredictionServiceFields,
	};
}

function buildOperationSharePayload(state: PredictionShareSectionValue) {
	if (state.mode !== "manual") {
		return null;
	}

	const shares = Object.fromEntries(
		state.selectedCompanyIds
			.map(companyId => [String(companyId), toNumberOrZero(state.shares[String(companyId)])] as const)
			.filter(([, amount]) => amount > 0),
	);

	return Object.keys(shares).length > 0 ? shares : null;
}

function buildManualSharesPayload(
	manualShares: OpenApiManualSharesValue,
	openapiModel: OpenApiPredictionModel,
	channels: OpenApiChannelSharesValue,
) {
	const payload: Record<string, unknown> = {};

	getOpenApiOperationSections(openapiModel).forEach((section) => {
		const sectionPayload = Object.fromEntries(
			OPENAPI_METRICS.map(metric => [
				metric.key,
				buildOperationSharePayload(manualShares[section.key][metric.key]),
			]).filter(([, shareValue]) => shareValue != null),
		);

		if (Object.keys(sectionPayload).length > 0) {
			payload[OPENAPI_API_SECTION_KEYS[section.key]] = sectionPayload;
		}
	});

	if (openapiModel === "PACKAGE") {
		const channelValue = Object.fromEntries(
			OPENAPI_CHANNEL_OPTIONS
				.map(channel => [channel.key, toNumberOrZero(channels.value[channel.key])] as const)
				.filter(([, amount]) => amount > 0),
		);

		if (Object.keys(channelValue).length > 0) {
			payload.channels = {
				value: channelValue,
			};
		}
	}

	return payload;
}

export function openApiPredictionFormToPayload(
	values: PredictionFormValues,
	_allCompanyIds: number[],
): OpenApiPredictionPayload {
	const fields = {
		...createEmptyOpenApiFields(),
		...(values.serviceFields as Partial<OpenApiPredictionServiceFields>),
	};
	const openapiModel = normalizeOpenApiModel(fields.openapiModel);
	const activeSections = getOpenApiOperationSections(openapiModel);
	void activeSections;

	return {
		service: Number(values.serviceId),
		fiscal_year: Number(values.fiscalYear),
		openapi_model: openapiModel,
		bill_inquiry_value_year: toNumberOrZero(fields.billInquiryValueYear),
		bill_inquiry_income_year: toNumberOrZero(fields.billInquiryIncomeYear),
		bill_inquiry_expense_year: toNumberOrZero(fields.billInquiryExpenseYear),
		receipt_register_value_year: openapiModel === "LEGACY" ? toNumberOrZero(fields.receiptRegisterValueYear) : 0,
		receipt_register_income_year: openapiModel === "LEGACY" ? toNumberOrZero(fields.receiptRegisterIncomeYear) : 0,
		receipt_register_expense_year: openapiModel === "LEGACY" ? toNumberOrZero(fields.receiptRegisterExpenseYear) : 0,
		sms_total_value_year: openapiModel === "PACKAGE" ? toNumberOrZero(fields.smsTotalValueYear) : 0,
		sms_total_income_year: openapiModel === "PACKAGE" ? toNumberOrZero(fields.smsTotalIncomeYear) : 0,
		sms_total_expense_year: openapiModel === "PACKAGE" ? toNumberOrZero(fields.smsTotalExpenseYear) : 0,
		traffic_total_value_year: openapiModel === "PACKAGE" ? toNumberOrZero(fields.trafficTotalValueYear) : 0,
		traffic_total_income_year: openapiModel === "PACKAGE" ? toNumberOrZero(fields.trafficTotalIncomeYear) : 0,
		traffic_total_expense_year: openapiModel === "PACKAGE" ? toNumberOrZero(fields.trafficTotalExpenseYear) : 0,
		q1_percent: Number(fields.q1Percent ?? 0),
		q2_percent: Number(fields.q2Percent ?? 0),
		q3_percent: Number(fields.q3Percent ?? 0),
		q4_percent: Number(fields.q4Percent ?? 0),
		manual_shares: buildManualSharesPayload(fields.manualShares, openapiModel, fields.channels),
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

export function openApiPredictionToListRow(
	record: OpenApiPredictionYearDto,
	context: { serviceId: number, serviceCode: PredictionListRow["serviceCode"], serviceLabel: string },
): PredictionListRow {
	return {
		id: record.id,
		serviceId: context.serviceId,
		serviceCode: context.serviceCode,
		serviceLabel: context.serviceLabel,
		fiscalYear: toNullableNumber(record.fiscal_year),
		preview: `${i18next.t("prediction.list.preview.model")}: ${record.openapi_model ?? "-"} | ${i18next.t("prediction.list.preview.value")}: ${formatPredictionNumber(record.bill_inquiry_value_year)}`,
		note: String(record.note ?? ""),
		createdAt: record.created_at ?? null,
		updatedAt: record.updated_at ?? null,
		raw: record,
	};
}
