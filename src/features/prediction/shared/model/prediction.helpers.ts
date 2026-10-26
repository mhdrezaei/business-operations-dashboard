import type { PredictionServiceCode } from "./prediction.form.types";

export interface PredictionYearOption {
	label: string
	value: number
}

export function normalizePredictionServiceCode(code: string | null | undefined) {
	return typeof code === "string" ? code.trim().toLowerCase() : "";
}

export function resolvePredictionServiceCode(code: PredictionServiceCode | null) {
	const normalized = normalizePredictionServiceCode(code);
	return normalized ? normalized as PredictionServiceCode : null;
}

const SUPPORTED_PREDICTION_SERVICE_CODES = new Set([
	"openapi",
	"psp",
	"shahkar",
	"sms",
	"traffic",
]);

export function isSupportedPredictionService(code: unknown) {
	return typeof code === "string" && SUPPORTED_PREDICTION_SERVICE_CODES.has(normalizePredictionServiceCode(code));
}

// PSP predictions are only registered for IPG companies (as in the old panel)
export function isAvailablePredictionCompanyType(serviceCode: unknown, companyType: unknown) {
	const normalizedServiceCode = typeof serviceCode === "string"
		? normalizePredictionServiceCode(serviceCode)
		: "";
	const normalizedCompanyType = typeof companyType === "string"
		? companyType.trim().toUpperCase()
		: "";

	return normalizedServiceCode !== "psp" || normalizedCompanyType === "IPG";
}

// the backend only accepts fiscal years from 1404
export const PREDICTION_FISCAL_YEAR_OPTIONS = [1404, 1405, 1406, 1407, 1408, 1409].map(year => ({
	label: String(year),
	value: year,
})) satisfies PredictionYearOption[];

const QUARTER_FIELD_KEYS = ["q1Percent", "q2Percent", "q3Percent", "q4Percent"] as const;

/** Fields kept when the service changes (the old panel keeps fiscal year, quarters and note). */
export function pickQuarterFields(fields: Record<string, unknown> | undefined) {
	return Object.fromEntries(QUARTER_FIELD_KEYS.map(key => [key, fields?.[key] ?? null]));
}

export function getRecordQuarterPercents(record: unknown) {
	const raw = (record ?? {}) as Record<string, unknown>;
	return [raw.q1_percent, raw.q2_percent, raw.q3_percent, raw.q4_percent];
}

export function toNullableNumber(value: unknown): number | null {
	if (value == null || value === "")
		return null;

	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

export function toNumberOrZero(value: unknown) {
	return toNullableNumber(value) ?? 0;
}

export function formatPredictionNumber(value: unknown) {
	const numeric = toNullableNumber(value);
	if (numeric == null)
		return "-";

	return numeric.toLocaleString("en-US");
}
