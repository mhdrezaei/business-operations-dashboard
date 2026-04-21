import type { SmsPredictionPayload, SmsPredictionYearDto } from "../../../api/predictions.api";
import type {
	PredictionFormValues,
	PredictionServiceCode,
	PredictionShareMode,
	PredictionShareSectionValue,
	SmsManualSharesValue,
	SmsPredictionServiceFields,
} from "../../model/prediction.form.types";
import type { PredictionListRow } from "../../model/prediction.list.types";
import i18next from "i18next";
import { formatPredictionNumber, toNullableNumber, toNumberOrZero } from "../../model/prediction.helpers";
import { createEmptySmsFields, createEmptySmsManualShares } from "./sms.config";

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

function buildSharePayload(
	manualShares: SmsManualSharesValue,
	allCompanyIds: number[],
) {
	const normalizedCompanyIds = Array.from(new Set(allCompanyIds))
		.filter(companyId => Number.isInteger(companyId) && companyId > 0);

	return Object.fromEntries(
		(["value", "income", "expense"] as const).map((metric) => {
			const state = manualShares[metric];
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
				metric,
				{
					mode: state.mode,
					shares,
				},
			];
		}),
	);
}

export function dtoToSmsPredictionForm(record: SmsPredictionYearDto): Partial<PredictionFormValues> {
	const empty = createEmptySmsFields();

	return {
		recordId: record.id,
		fiscalYear: record.fiscal_year,
		note: record.note ?? "",
		serviceFields: {
			...empty,
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
		} satisfies SmsPredictionServiceFields,
	};
}

export function smsPredictionFormToPayload(
	values: PredictionFormValues,
	allCompanyIds: number[],
): SmsPredictionPayload {
	const fields = {
		...createEmptySmsFields(),
		...(values.serviceFields as Partial<SmsPredictionServiceFields>),
	};

	return {
		service: Number(values.serviceId),
		fiscal_year: Number(values.fiscalYear),
		value_year: toNumberOrZero(fields.valueYear),
		income_year: toNumberOrZero(fields.incomeYear),
		expense_year: toNumberOrZero(fields.expenseYear),
		price_buy: toNumberOrZero(fields.priceBuy),
		price_sell: toNumberOrZero(fields.priceSell),
		q1_percent: Number(fields.q1Percent ?? 0),
		q2_percent: Number(fields.q2Percent ?? 0),
		q3_percent: Number(fields.q3Percent ?? 0),
		q4_percent: Number(fields.q4Percent ?? 0),
		manual_shares: buildSharePayload(fields.manualShares, allCompanyIds),
		note: String(values.note ?? ""),
	};
}

export function findSmsPredictionByFiscalYear(
	records: SmsPredictionYearDto[],
	fiscalYear: number | null | undefined,
) {
	if (!fiscalYear)
		return null;

	return records.find(record => Number(record.fiscal_year) === Number(fiscalYear)) ?? null;
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
		fiscalYear: toNullableNumber(record.fiscal_year),
		preview: `${i18next.t("prediction.list.preview.value")}: ${formatPredictionNumber(record.value_year)} | ${i18next.t("prediction.list.preview.price")}: ${formatPredictionNumber(record.price_sell)}`,
		note: String(record.note ?? ""),
		createdAt: record.created_at ?? null,
		updatedAt: record.updated_at ?? null,
		raw: record,
	};
}
