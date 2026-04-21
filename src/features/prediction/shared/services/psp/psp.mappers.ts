import type { PspPredictionPayload, PspPredictionYearDto } from "../../../api/predictions.api";
import type {
	PredictionFormValues,
	PredictionServiceCode,
	PredictionShareMode,
	PredictionShareSectionValue,
	PspPredictionServiceFields,
	YearlyValueIncomeManualSharesValue,
} from "../../model/prediction.form.types";
import type { PredictionListRow } from "../../model/prediction.list.types";
import i18next from "i18next";
import { formatPredictionNumber, toNullableNumber, toNumberOrZero } from "../../model/prediction.helpers";
import {
	createEmptyYearlyValueIncomeFields,
	createEmptyYearlyValueIncomeManualShares,
} from "./psp.config";

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

export function normalizeYearlyValueIncomeManualShares(value: unknown): YearlyValueIncomeManualSharesValue {
	const fallback = createEmptyYearlyValueIncomeManualShares();
	if (!value || typeof value !== "object")
		return fallback;

	const raw = value as Record<string, unknown>;
	return {
		value: normalizeShareSection(raw.value),
		income: normalizeShareSection(raw.income),
	};
}

export function buildYearlyValueIncomeSharePayload(
	manualShares: YearlyValueIncomeManualSharesValue,
	allCompanyIds: number[],
) {
	const normalizedCompanyIds = Array.from(new Set(allCompanyIds))
		.filter(companyId => Number.isInteger(companyId) && companyId > 0);

	return Object.fromEntries(
		(["value", "income"] as const).map((metric) => {
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

export function dtoToYearlyValueIncomePredictionForm(record: PspPredictionYearDto): Partial<PredictionFormValues> {
	const empty = createEmptyYearlyValueIncomeFields();

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
			manualShares: normalizeYearlyValueIncomeManualShares(record.manual_shares),
		} satisfies PspPredictionServiceFields,
	};
}

export function yearlyValueIncomePredictionFormToPayload(
	values: PredictionFormValues,
	allCompanyIds: number[],
): PspPredictionPayload {
	const fields = {
		...createEmptyYearlyValueIncomeFields(),
		...(values.serviceFields as Partial<PspPredictionServiceFields>),
	};

	return {
		service: Number(values.serviceId),
		fiscal_year: Number(values.fiscalYear),
		value_year: toNumberOrZero(fields.valueYear),
		income_year: toNumberOrZero(fields.incomeYear),
		q1_percent: Number(fields.q1Percent ?? 0),
		q2_percent: Number(fields.q2Percent ?? 0),
		q3_percent: Number(fields.q3Percent ?? 0),
		q4_percent: Number(fields.q4Percent ?? 0),
		manual_shares: buildYearlyValueIncomeSharePayload(fields.manualShares, allCompanyIds),
		note: String(values.note ?? ""),
	};
}

export function findYearlyValueIncomePredictionByFiscalYear(
	records: PspPredictionYearDto[],
	fiscalYear: number | null | undefined,
) {
	if (!fiscalYear)
		return null;

	return records.find(record => Number(record.fiscal_year) === Number(fiscalYear)) ?? null;
}

export function dtoToPspPredictionForm(record: PspPredictionYearDto): Partial<PredictionFormValues> {
	return dtoToYearlyValueIncomePredictionForm(record);
}

export function pspPredictionFormToPayload(
	values: PredictionFormValues,
	allCompanyIds: number[],
): PspPredictionPayload {
	return yearlyValueIncomePredictionFormToPayload(values, allCompanyIds);
}

export function findPspPredictionByFiscalYear(
	records: PspPredictionYearDto[],
	fiscalYear: number | null | undefined,
) {
	return findYearlyValueIncomePredictionByFiscalYear(records, fiscalYear);
}

export function yearlyValueIncomePredictionToListRow(
	record: PspPredictionYearDto,
	context: { serviceId: number, serviceCode: PredictionServiceCode, serviceLabel: string },
): PredictionListRow {
	return {
		id: record.id,
		serviceId: context.serviceId,
		serviceCode: context.serviceCode,
		serviceLabel: context.serviceLabel,
		fiscalYear: toNullableNumber(record.fiscal_year),
		preview: `${i18next.t("prediction.list.preview.value")}: ${formatPredictionNumber(record.value_year)} | ${i18next.t("prediction.list.preview.income")}: ${formatPredictionNumber(record.income_year)}`,
		note: String(record.note ?? ""),
		createdAt: record.created_at ?? null,
		updatedAt: record.updated_at ?? null,
		raw: record,
	};
}
