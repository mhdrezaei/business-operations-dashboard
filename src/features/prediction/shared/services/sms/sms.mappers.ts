import type { CompanyDto } from "#src/api/common/common.types";
import type { SmsPredictionPayload, SmsPredictionYearDto } from "../../../api/predictions.api";
import type {
	PredictionFormValues,
	PredictionServiceCode,
	PredictionShareMode,
	PredictionShareSectionValue,
	SmsChannelSharesValue,
	SmsManualSharesValue,
	SmsPredictionServiceFields,
} from "../../model/prediction.form.types";
import type { PredictionListRow } from "../../model/prediction.list.types";
import i18next from "i18next";
import { companyTypeMatches, getCompanyTypeToken } from "../../model/company-type.helpers";
import { formatPredictionNumber, toNullableNumber, toNumberOrZero } from "../../model/prediction.helpers";
import {
	createEmptySmsChannelShares,
	createEmptySmsFields,
	createEmptySmsManualShares,
	SMS_CHANNEL_OPTIONS,
	SMS_METRIC_KEYS,
} from "./sms.config";

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

function normalizeManualShares(value: unknown): SmsManualSharesValue {
	const fallback = createEmptySmsManualShares();
	if (!value || typeof value !== "object")
		return fallback;

	const raw = value as Record<string, unknown>;
	return {
		value: normalizeShareSection(raw.value),
		income: normalizeShareSection(raw.income),
		expense: normalizeShareSection(raw.expense),
	};
}

function normalizeChannelShares(value: unknown): SmsChannelSharesValue {
	const fallback = createEmptySmsChannelShares();
	if (!value || typeof value !== "object")
		return fallback;

	const channels = (value as Record<string, unknown>).channels;
	if (!channels || typeof channels !== "object")
		return fallback;

	return Object.fromEntries(
		SMS_METRIC_KEYS.map((metric) => {
			const metricChannels = (channels as Record<string, unknown>)[metric];
			return [
				metric,
				Object.fromEntries(
					SMS_CHANNEL_OPTIONS.map(channel => [
						channel.key,
						metricChannels && typeof metricChannels === "object"
							? toNullableNumber((metricChannels as Record<string, unknown>)[channel.key])
							: null,
					]),
				),
			];
		}),
	) as SmsChannelSharesValue;
}

function buildSharePayload(
	manualShares: SmsManualSharesValue,
	companies: CompanyDto[],
	companyType: string | null | undefined,
) {
	const allowedCompanyIds = new Set(Array.from(new Set(
		companies
			.filter(company => companyTypeMatches(company.company_type, companyType))
			.map(company => company.id),
	))
		.filter(companyId => Number.isInteger(companyId) && companyId > 0));

	return Object.fromEntries(
		SMS_METRIC_KEYS.map((metric) => {
			const state = manualShares[metric];

			if (state.mode !== "manual")
				return [metric, null] as const;

			const shares = Object.fromEntries(
				state.selectedCompanyIds
					.filter(companyId => allowedCompanyIds.has(companyId))
					.map((companyId) => {
						const companyKey = String(companyId);
						return [companyKey, toNumberOrZero(state.shares[companyKey])] as const;
					})
					.filter(([, amount]) => amount > 0),
			);

			return [metric, Object.keys(shares).length > 0 ? shares : null] as const;
		})
			.filter(([, shares]) => shares != null),
	);
}

function buildChannelPayload(channels: SmsChannelSharesValue, manualShares: SmsManualSharesValue) {
	const payload = Object.fromEntries(
		SMS_METRIC_KEYS
			.filter(metric => manualShares[metric].mode === "manual")
			.map(metric => [
				metric,
				Object.fromEntries(
					SMS_CHANNEL_OPTIONS
						.map(channel => [channel.key, toNullableNumber(channels[metric][channel.key])] as const)
						.filter(([, amount]) => amount != null),
				),
			] as const)
			.filter(([, metricChannels]) => Object.keys(metricChannels).length > 0),
	);

	return Object.keys(payload).length > 0 ? payload : null;
}

export function dtoToSmsPredictionForm(record: SmsPredictionYearDto): Partial<PredictionFormValues> {
	const empty = createEmptySmsFields();

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
			valueYear: toNullableNumber(record.value_year),
			incomeYear: toNullableNumber(record.income_year),
			expenseYear: toNullableNumber(record.expense_year),
			priceBuy: toNullableNumber(record.price_buy),
			priceSell: toNullableNumber(record.price_sell),
			manualShares: normalizeManualShares(record.manual_shares),
			channels: normalizeChannelShares(record.manual_shares),
		} satisfies SmsPredictionServiceFields,
	};
}

export function smsPredictionFormToPayload(
	values: PredictionFormValues,
	companies: CompanyDto[],
): SmsPredictionPayload {
	const fields = {
		...createEmptySmsFields(),
		...(values.serviceFields as Partial<SmsPredictionServiceFields>),
	};
	const channelPayload = buildChannelPayload(fields.channels, fields.manualShares);

	return {
		service: Number(values.serviceId),
		fiscal_year: Number(values.fiscalYear),
		company_type: String(fields.companyType ?? ""),
		value_year: Number(fields.valueYear),
		income_year: toNumberOrZero(fields.incomeYear),
		expense_year: toNumberOrZero(fields.expenseYear),
		price_buy: Number(fields.priceBuy),
		price_sell: Number(fields.priceSell),
		q1_percent: Number(fields.q1Percent ?? 0),
		q2_percent: Number(fields.q2Percent ?? 0),
		q3_percent: Number(fields.q3Percent ?? 0),
		q4_percent: Number(fields.q4Percent ?? 0),
		manual_shares: {
			...buildSharePayload(fields.manualShares, companies, fields.companyType),
			...(channelPayload ? { channels: channelPayload } : {}),
		},
		note: String(values.note ?? ""),
	};
}

export function findSmsPredictionByFiscalYear(
	records: SmsPredictionYearDto[],
	fiscalYear: number | null | undefined,
	serviceFields?: Record<string, unknown>,
) {
	const companyType = getCompanyTypeToken(serviceFields?.companyType);
	if (!fiscalYear || !companyType)
		return null;

	return records.find(record =>
		Number(record.fiscal_year) === Number(fiscalYear)
		&& companyTypeMatches(record.company_type, companyType),
	) ?? null;
}

export function smsPredictionToListRow(
	record: SmsPredictionYearDto,
	context: { serviceId: number, serviceCode: PredictionServiceCode, serviceLabel: string },
): PredictionListRow {
	return {
		id: record.id,
		serviceId: context.serviceId,
		serviceCode: context.serviceCode,
		serviceLabel: context.serviceLabel,
		companyType: getCompanyTypeToken(record.company_type),
		fiscalYear: toNullableNumber(record.fiscal_year),
		preview: `${i18next.t("prediction.list.preview.companyType")}: ${getCompanyTypeToken(record.company_type) ?? "-"} | ${i18next.t("prediction.list.preview.value")}: ${formatPredictionNumber(record.value_year)} | ${i18next.t("prediction.list.preview.priceBuy")}: ${formatPredictionNumber(record.price_buy)} | ${i18next.t("prediction.list.preview.price")}: ${formatPredictionNumber(record.price_sell)}`,
		note: String(record.note ?? ""),
		createdAt: record.created_at ?? null,
		updatedAt: record.updated_at ?? null,
		raw: record,
	};
}
