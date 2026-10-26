import type { CompanyDto } from "#src/api/common/common.types";
import type {
	TrafficPredictionPayload,
	TrafficPredictionYearDto,
} from "../../../api/predictions.api";
import type {
	PredictionFormValues,
	PredictionServiceCode,
	PredictionShareMode,
	PredictionShareSectionValue,
	TrafficCompanyType,
	TrafficLocationCode,
	TrafficManualSharesValue,
	TrafficPredictionLocationFormValue,
	TrafficPredictionMetricCode,
	TrafficPredictionServiceFields,
} from "../../model/prediction.form.types";
import type { PredictionListRow } from "../../model/prediction.list.types";
import i18next from "i18next";
import { companyTypeMatches, getCompanyTypeToken } from "../../model/company-type.helpers";
import { formatPredictionNumber, toNullableNumber, toNumberOrZero } from "../../model/prediction.helpers";
import {
	createEmptyTrafficFields,
	createEmptyTrafficLocation,
	createEmptyTrafficManualShares,
	isTrafficLocationCode,
	normalizeTrafficLocationCode,
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

function normalizeManualShares(value: unknown): TrafficManualSharesValue {
	const fallback = createEmptyTrafficManualShares();
	if (!value || typeof value !== "object")
		return fallback;

	const raw = value as Record<string, unknown>;
	return Object.fromEntries(
		TRAFFIC_LOCATION_OPTIONS.map((locationOption) => {
			const locationRaw = (raw[locationOption.value] ?? raw.PROVINCE) as Record<string, unknown> | undefined;
			return [
				locationOption.value,
				Object.fromEntries(
					TRAFFIC_METRICS.map(metric => [
						metric.key,
						normalizeShareSection(locationRaw?.[metric.apiKey]),
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
	const location = normalizeTrafficLocationCode(raw.location);
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
		.filter(company => companyTypeMatches(company.company_type, companyType))
		.map(company => company.id)
		.filter(companyId => Number.isInteger(companyId) && companyId > 0);
}

function buildLocationSharePayload(
	state: TrafficManualSharesValue[TrafficLocationCode][TrafficPredictionMetricCode],
	relevantCompanyIds: number[],
) {
	const selected = new Set(state.selectedCompanyIds.map(String));
	if (state.mode !== "manual")
		return null;

	const shares = Object.fromEntries(
		relevantCompanyIds
			.map((companyId) => {
				const companyKey = String(companyId);
				const amount = selected.has(companyKey)
					? toNumberOrZero(state.shares[companyKey])
					: 0;
				return [companyKey, amount] as const;
			})
			.filter(([, amount]) => amount > 0),
	);

	return Object.keys(shares).length > 0 ? shares : null;
}

export function dtoToTrafficPredictionForm(record: TrafficPredictionYearDto): Partial<PredictionFormValues> {
	const empty = createEmptyTrafficFields();
	const normalizedLocations = (record.locations ?? [])
		.map(location => normalizeLocation(location))
		.filter((location): location is TrafficPredictionLocationFormValue => location != null);
	const locations = empty.locations.map(defaultLocation => (
		normalizedLocations.find(location => location.location === defaultLocation.location)
		?? defaultLocation
	));

	return {
		recordId: record.id,
		fiscalYear: record.fiscal_year,
		note: record.note ?? "",
		serviceFields: {
			...empty,
			companyType: getCompanyTypeToken(record.company_type),
			q1Percent: toNullableNumber(record.q1_percent),
			q2Percent: toNullableNumber(record.q2_percent),
			q3Percent: toNullableNumber(record.q3_percent),
			q4Percent: toNullableNumber(record.q4_percent),
			locations,
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
			activeLocationCodes
				.map((locationCode) => {
					const locationShares = Object.fromEntries(
						TRAFFIC_METRICS
							.map(metric => [
								metric.apiKey,
								buildLocationSharePayload(fields.manualShares[locationCode][metric.key], relevantCompanyIds),
							] as const)
							.filter(([, shareValue]) => shareValue != null),
					);

					return [locationCode, locationShares] as const;
				})
				.filter(([, locationShares]) => Object.keys(locationShares).length > 0),
		),
		note: String(values.note ?? ""),
	};
}

export function findTrafficPredictionBySelection(
	records: TrafficPredictionYearDto[],
	fiscalYear: number | null | undefined,
	serviceFields: Record<string, unknown>,
) {
	const companyType = getCompanyTypeToken(serviceFields.companyType);
	if (!fiscalYear || !companyType)
		return null;

	return records.find(record =>
		Number(record.fiscal_year) === Number(fiscalYear)
		&& companyTypeMatches(record.company_type, companyType),
	) ?? null;
}

function buildTrafficPreview(record: TrafficPredictionYearDto) {
	const locations = TRAFFIC_LOCATION_OPTIONS.map((locationOption) => {
		const location = (record.locations ?? []).find(item => normalizeTrafficLocationCode(item.location) === locationOption.value);
		const values = [
			[TRAFFIC_METRICS[0].titleKey, location?.value_year],
			[TRAFFIC_METRICS[1].titleKey, location?.value_receive_year],
			[TRAFFIC_METRICS[2].titleKey, location?.income_year],
			[TRAFFIC_METRICS[3].titleKey, location?.expense_year],
		].map(([titleKey, amount]) => `${i18next.t(titleKey as string)}: ${formatPredictionNumber(amount)}`);
		return `${i18next.t(locationOption.labelKey)} (${values.join("، ")})`;
	});

	return [
		`${i18next.t("prediction.list.preview.companyType")}: ${getCompanyTypeToken(record.company_type) ?? "-"}`,
		...locations,
	].join(" | ");
}

export function trafficPredictionToListRow(
	record: TrafficPredictionYearDto,
	context: { serviceId: number, serviceCode: PredictionServiceCode, serviceLabel: string },
): PredictionListRow {
	return {
		id: record.id,
		serviceId: context.serviceId,
		serviceCode: context.serviceCode,
		serviceLabel: context.serviceLabel,
		companyType: getCompanyTypeToken(record.company_type),
		fiscalYear: toNullableNumber(record.fiscal_year),
		preview: buildTrafficPreview(record),
		note: String(record.note ?? ""),
		createdAt: record.created_at ?? null,
		updatedAt: record.updated_at ?? null,
		raw: record,
	};
}
