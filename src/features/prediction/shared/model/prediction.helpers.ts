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

function normalizePersianDigits(value: string) {
	// eslint-disable-next-line regexp/no-obscure-range
	return value.replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

export function currentJalaliYear() {
	const formattedYear = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
		year: "numeric",
	}).format(new Date());

	return Number(normalizePersianDigits(formattedYear));
}

export function buildFiscalYearOptions(existingYears: number[]) {
	const year = currentJalaliYear();
	const candidates = new Set<number>([
		year - 2,
		year - 1,
		year,
		year + 1,
		year + 2,
		...existingYears,
	]);

	return Array.from(candidates)
		.filter(value => Number.isInteger(value) && value >= 1390)
		.sort((a, b) => a - b)
		.map(value => ({
			label: String(value),
			value,
		})) satisfies PredictionYearOption[];
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
