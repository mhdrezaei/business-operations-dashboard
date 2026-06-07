import type { CompanyDto } from "#src/api/common/common.types";
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
import { companyTypeMatches, getCompanyTypeToken } from "../../model/company-type.helpers";
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
	const allowedCompanyIds = new Set(
		Array.from(new Set(allCompanyIds))
			.filter(companyId => Number.isInteger(companyId) && companyId > 0),
	);

	return Object.fromEntries(
		(["value", "income"] as const).map((metric) => {
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

function getCompanyIdsForType(companies: CompanyDto[], companyType: string | null | undefined) {
	if (!companyType)
		return [];

	return companies
		.filter(company => companyTypeMatches(company.company_type, companyType))
		.map(company => company.id)
		.filter(companyId => Number.isInteger(companyId) && companyId > 0);
}

export function dtoToYearlyValueIncomePredictionForm(record: PspPredictionYearDto): Partial<PredictionFormValues> {
	const empty = createEmptyYearlyValueIncomeFields();

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
			manualShares: normalizeYearlyValueIncomeManualShares(record.manual_shares),
		} satisfies PspPredictionServiceFields,
	};
}

export function yearlyValueIncomePredictionFormToPayload(
	values: PredictionFormValues,
	companies: CompanyDto[] | number[],
	options: { includeCompanyType?: boolean } = {},
): PspPredictionPayload {
	const fields = {
		...createEmptyYearlyValueIncomeFields(),
		...(values.serviceFields as Partial<PspPredictionServiceFields>),
	};
	const allCompanyIds = Array.isArray(companies) && typeof companies[0] === "object"
		? getCompanyIdsForType(companies as CompanyDto[], fields.companyType)
		: companies as number[];

	return {
		service: Number(values.serviceId),
		fiscal_year: Number(values.fiscalYear),
		...(options.includeCompanyType ? { company_type: String(fields.companyType ?? "") } : {}),
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
	companyType?: string | null | undefined,
) {
	if (!fiscalYear)
		return null;

	return records.find(record =>
		Number(record.fiscal_year) === Number(fiscalYear)
		&& (companyType ? companyTypeMatches(record.company_type, companyType) : true),
	) ?? null;
}

export function dtoToPspPredictionForm(record: PspPredictionYearDto): Partial<PredictionFormValues> {
	return dtoToYearlyValueIncomePredictionForm(record);
}

export function pspPredictionFormToPayload(
	values: PredictionFormValues,
	companies: CompanyDto[],
): PspPredictionPayload {
	return yearlyValueIncomePredictionFormToPayload(values, companies, { includeCompanyType: true });
}

export function findPspPredictionByFiscalYear(
	records: PspPredictionYearDto[],
	fiscalYear: number | null | undefined,
	serviceFields?: Record<string, unknown>,
) {
	const companyType = getCompanyTypeToken(serviceFields?.companyType);
	if (!companyType)
		return null;

	return findYearlyValueIncomePredictionByFiscalYear(records, fiscalYear, companyType);
}

export function yearlyValueIncomePredictionToListRow(
	record: PspPredictionYearDto,
	context: { serviceId: number, serviceCode: PredictionServiceCode, serviceLabel: string },
): PredictionListRow {
	const metricPreview = `${i18next.t("prediction.list.preview.value")}: ${formatPredictionNumber(record.value_year)} | ${i18next.t("prediction.list.preview.income")}: ${formatPredictionNumber(record.income_year)}`;
	const preview = context.serviceCode === "psp"
		? `${i18next.t("prediction.list.preview.companyType")}: ${getCompanyTypeToken(record.company_type) ?? "-"} | ${metricPreview}`
		: metricPreview;

	return {
		id: record.id,
		serviceId: context.serviceId,
		serviceCode: context.serviceCode,
		serviceLabel: context.serviceLabel,
		fiscalYear: toNullableNumber(record.fiscal_year),
		preview,
		note: String(record.note ?? ""),
		createdAt: record.created_at ?? null,
		updatedAt: record.updated_at ?? null,
		raw: record,
	};
}
