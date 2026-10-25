import type { OpenApiAmountKey, OpenApiPredictionPayload, OpenApiPredictionYearDto } from "../../../api/predictions.api";
import type {
	OpenApiAmountField,
	OpenApiManualSharesValue,
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
	createEmptyOpenApiFields,
	createEmptyOpenApiManualShares,
	getOpenApiAmountField,
	getOpenApiOperationSections,
	OPENAPI_METRICS,
	OPENAPI_OPERATION_SECTIONS,
} from "./openapi.config";

export function resolveOpenApiModel(record: Pick<OpenApiPredictionYearDto, "openapi_model" | "manual_shares">): OpenApiPredictionModel {
	const model = String(record.openapi_model ?? "").toUpperCase();
	if (model === "LEGACY" || model === "LEGACY_2" || model === "PACKAGE")
		return model;

	const shareKeys = Object.keys(record.manual_shares ?? {});
	return OPENAPI_OPERATION_SECTIONS.some(section => section.model === "LEGACY_2" && shareKeys.includes(section.shareKey))
		? "LEGACY_2"
		: "LEGACY";
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
	return Object.fromEntries(
		OPENAPI_OPERATION_SECTIONS.map((section) => {
			const sectionRaw = raw[section.shareKey] as Record<string, unknown> | undefined;
			return [
				section.key,
				Object.fromEntries(
					OPENAPI_METRICS.map(metric => [metric.key, normalizeShareSection(sectionRaw?.[metric.key])]),
				),
			];
		}),
	) as OpenApiManualSharesValue;
}

const PACKAGE_EXTRA_AMOUNT_KEYS = OPENAPI_METRICS.flatMap(metric => [
	`sms_total_${metric.key}_year`,
	`traffic_total_${metric.key}_year`,
]);

// SMS_TOTAL / TRAFFIC / channels shares: stored by PACKAGE records, no form fields, must survive an edit
const PACKAGE_EXTRA_SHARE_KEYS = ["SMS_TOTAL", "TRAFFIC", "channels"];

function pickPackageExtras(record: OpenApiPredictionYearDto): Record<string, unknown> {
	const raw = record as unknown as Record<string, unknown>;
	const manualShares = (record.manual_shares ?? {}) as Record<string, unknown>;
	return {
		...Object.fromEntries(PACKAGE_EXTRA_AMOUNT_KEYS.filter(key => raw[key] != null).map(key => [key, raw[key]])),
		manual_shares: Object.fromEntries(
			PACKAGE_EXTRA_SHARE_KEYS.filter(key => manualShares[key] != null).map(key => [key, manualShares[key]]),
		),
	};
}

export function dtoToOpenApiPredictionForm(record: OpenApiPredictionYearDto): Partial<PredictionFormValues> {
	const empty = createEmptyOpenApiFields();
	const amounts = Object.fromEntries(
		OPENAPI_OPERATION_SECTIONS.flatMap(section =>
			OPENAPI_METRICS.map(metric => [
				getOpenApiAmountField(section.key, metric.key),
				toNullableNumber(record[`${section.apiKey}_${metric.key}_year`]),
			] as const),
		),
	) as Record<OpenApiAmountField, number | null>;

	return {
		recordId: record.id,
		fiscalYear: record.fiscal_year,
		note: record.note ?? "",
		serviceFields: {
			...empty,
			...amounts,
			openapiModel: resolveOpenApiModel(record),
			q1Percent: toNullableNumber(record.q1_percent),
			q2Percent: toNullableNumber(record.q2_percent),
			q3Percent: toNullableNumber(record.q3_percent),
			q4Percent: toNullableNumber(record.q4_percent),
			manualShares: normalizeManualShares(record.manual_shares),
			...(resolveOpenApiModel(record) === "PACKAGE" ? { packageExtras: pickPackageExtras(record) } : {}),
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
			payload[section.shareKey] = sectionPayload;
		}
	});

	return payload;
}

export function openApiPredictionFormToPayload(values: PredictionFormValues): OpenApiPredictionPayload {
	const fields = {
		...createEmptyOpenApiFields(),
		...(values.serviceFields as Partial<OpenApiPredictionServiceFields>),
	};
	const amounts = Object.fromEntries(
		OPENAPI_OPERATION_SECTIONS.flatMap(section =>
			OPENAPI_METRICS
				.map(metric => [`${section.apiKey}_${metric.key}_year`, toNullableNumber(fields[getOpenApiAmountField(section.key, metric.key)])] as const)
				.filter(([, amount]) => amount != null),
		),
	);

	// the API rejects PACKAGE on write: leaving openapi_model out keeps the stored model unchanged
	const isPackage = fields.openapiModel === "PACKAGE";
	const { manual_shares: extraShares, ...extraAmounts } = (isPackage ? fields.packageExtras : null) ?? {};

	return {
		service: Number(values.serviceId),
		fiscal_year: Number(values.fiscalYear),
		...(isPackage ? {} : { openapi_model: fields.openapiModel }),
		...amounts,
		...extraAmounts as Partial<Record<OpenApiAmountKey, number>>,
		q1_percent: Number(fields.q1Percent ?? 0),
		q2_percent: Number(fields.q2Percent ?? 0),
		q3_percent: Number(fields.q3Percent ?? 0),
		q4_percent: Number(fields.q4Percent ?? 0),
		manual_shares: {
			...(extraShares as Record<string, unknown> | undefined),
			...buildManualSharesPayload(fields.manualShares, fields.openapiModel),
		},
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

function buildOpenApiPreview(record: OpenApiPredictionYearDto) {
	const model = resolveOpenApiModel(record);
	const sections = getOpenApiOperationSections(model).map((section) => {
		const [value, income, expense] = OPENAPI_METRICS.map(metric =>
			`${i18next.t(metric.titleKey)}: ${formatPredictionNumber(record[`${section.apiKey}_${metric.key}_year`])}`);
		return `${i18next.t(section.titleKey)} (${value}، ${income}، ${expense})`;
	});

	return [`${i18next.t("prediction.list.preview.model")}: ${model}`, ...sections].join(" | ");
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
		preview: buildOpenApiPreview(record),
		note: String(record.note ?? ""),
		createdAt: record.created_at ?? null,
		updatedAt: record.updated_at ?? null,
		raw: record,
	};
}
