import type { CompanyDto } from "#src/api/common/common.types";
import type {
	TrafficPredictionPayload,
	TrafficPredictionYearDto,
} from "../../../api/predictions.api";
import type {
	PredictionFormValues,
	PredictionShareMode,
	PredictionShareSectionValue,
	TrafficCompanyType,
	TrafficLocationCode,
	TrafficManualSharesValue,
	TrafficPredictionLocationFormValue,
	TrafficPredictionMetricCode,
	TrafficPredictionServiceFields,
} from "../../model/prediction.form.types";
import { toNullableNumber, toNumberOrZero } from "../../model/prediction.helpers";
import {
	createEmptyTrafficFields,
	createEmptyTrafficLocation,
	createEmptyTrafficManualShares,
	isTrafficCompanyType,
	isTrafficLocationCode,
	TRAFFIC_LOCATION_OPTIONS,
	TRAFFIC_METRICS,
} from "./traffic.config";

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

function normalizeManualShares(value: unknown): TrafficManualSharesValue {
	const fallback = createEmptyTrafficManualShares();
	if (!value || typeof value !== "object")
		return fallback;

	const raw = value as Record<string, unknown>;
	return Object.fromEntries(
		TRAFFIC_LOCATION_OPTIONS.map((locationOption) => {
			const locationRaw = raw[locationOption.value] as Record<string, unknown> | undefined;
			return [
				locationOption.value,
				Object.fromEntries(
					TRAFFIC_METRICS.map(metric => [
						metric.key,
						normalizeShareSection(locationRaw?.[metric.key]),
					]),
				),
			];
		}),
	) as TrafficManualSharesValue;
}

function normalizeLocation(value: unknown): TrafficPredictionLocationFormValue | null {
	if (!value || typeof value !== "object")
		return null;

	const raw = value as Record<string, unknown>;
	const location = isTrafficLocationCode(raw.location) ? raw.location : null;
	if (!location)
		return null;

	return {
		location,
		valueYear: toNullableNumber(raw.value_year),
		valueReceiveYear: toNullableNumber(raw.value_receive_year),
		incomeYear: toNullableNumber(raw.income_year),
		expenseYear: toNullableNumber(raw.expense_year),
	};
}

function getCompanyIdsForType(companies: CompanyDto[], companyType: TrafficCompanyType | null) {
	if (!companyType)
		return [];

	return companies
		.filter(company => company.company_type === companyType)
		.map(company => company.id)
		.filter(companyId => Number.isInteger(companyId) && companyId > 0);
}

function buildLocationSharePayload(
	state: TrafficManualSharesValue[TrafficLocationCode][TrafficPredictionMetricCode],
	relevantCompanyIds: number[],
) {
	const selected = new Set(state.selectedCompanyIds.map(String));
	return {
		mode: state.mode,
		shares: Object.fromEntries(
			relevantCompanyIds.map((companyId) => {
				const companyKey = String(companyId);
				const amount = selected.has(companyKey)
					? toNumberOrZero(state.shares[companyKey])
					: 0;
				return [companyKey, amount];
			}),
		),
	};
}

export function dtoToTrafficPredictionForm(record: TrafficPredictionYearDto): Partial<PredictionFormValues> {
	const empty = createEmptyTrafficFields();
	const normalizedLocations = (record.locations ?? [])
		.map(location => normalizeLocation(location))
		.filter((location): location is TrafficPredictionLocationFormValue => location != null);

	return {
		recordId: record.id,
		fiscalYear: record.fiscal_year,
		note: record.note ?? "",
		serviceFields: {
			...empty,
			companyType: isTrafficCompanyType(record.company_type) ? record.company_type : null,
			q1Percent: toNullableNumber(record.q1_percent),
			q2Percent: toNullableNumber(record.q2_percent),
			q3Percent: toNullableNumber(record.q3_percent),
			q4Percent: toNullableNumber(record.q4_percent),
			locations: normalizedLocations.length > 0 ? normalizedLocations : empty.locations,
			manualShares: normalizeManualShares(record.manual_shares),
		} satisfies TrafficPredictionServiceFields,
	};
}

export function trafficPredictionFormToPayload(
	values: PredictionFormValues,
	companies: CompanyDto[],
): TrafficPredictionPayload {
	const fields = {
		...createEmptyTrafficFields(values.serviceFields),
		...(values.serviceFields as Partial<TrafficPredictionServiceFields>),
	};

	const relevantCompanyIds = getCompanyIdsForType(companies, fields.companyType);
	const activeLocationCodes = Array.from(
		new Set(
			(fields.locations ?? [])
				.map(location => location.location)
				.filter((location): location is TrafficLocationCode => isTrafficLocationCode(location)),
		),
	);

	return {
		service: Number(values.serviceId),
		fiscal_year: Number(values.fiscalYear),
		company_type: String(fields.companyType ?? ""),
		locations: activeLocationCodes.map((locationCode) => {
			const current = fields.locations.find(location => location.location === locationCode) ?? createEmptyTrafficLocation(locationCode);

			return {
				location: locationCode,
				value_year: toNumberOrZero(current.valueYear),
				value_receive_year: toNumberOrZero(current.valueReceiveYear),
				income_year: toNumberOrZero(current.incomeYear),
				expense_year: toNumberOrZero(current.expenseYear),
			};
		}),
		q1_percent: Number(fields.q1Percent ?? 0),
		q2_percent: Number(fields.q2Percent ?? 0),
		q3_percent: Number(fields.q3Percent ?? 0),
		q4_percent: Number(fields.q4Percent ?? 0),
		manual_shares: Object.fromEntries(
			activeLocationCodes.map(locationCode => [
				locationCode,
				Object.fromEntries(
					TRAFFIC_METRICS.map(metric => [
						metric.key,
						buildLocationSharePayload(fields.manualShares[locationCode][metric.key], relevantCompanyIds),
					]),
				),
			]),
		),
		note: String(values.note ?? ""),
	};
}

export function findTrafficPredictionBySelection(
	records: TrafficPredictionYearDto[],
	fiscalYear: number | null | undefined,
	serviceFields: Record<string, unknown>,
) {
	const companyType = isTrafficCompanyType(serviceFields.companyType) ? serviceFields.companyType : null;
	if (!fiscalYear || !companyType)
		return null;

	return records.find(record =>
		Number(record.fiscal_year) === Number(fiscalYear)
		&& record.company_type === companyType,
	) ?? null;
}
