import { i18n } from "#src/locales";

/** Persian digits in the Persian UI (the dashboard's primary mode), Latin digits otherwise. */
export function numberLocale() {
	return i18n.language === "fa-IR" ? "fa-IR" : "en-US";
}

/** null/undefined/NaN → null (never zero: missing data is not "0"). */
export function toNum(value: unknown): number | null {
	if (value === null || value === undefined || value === "")
		return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
	return value.toLocaleString(numberLocale(), options);
}

export function formatCount(value: unknown) {
	const n = toNum(value);
	return n === null ? "—" : formatNumber(n);
}

export function formatRial(value: unknown) {
	const n = toNum(value);
	return n === null ? "—" : i18n.t("dashboard.format.rial", { value: formatNumber(Math.round(n)) });
}

/** Rial amount without the unit, scaled to thousand/million/billion (chart axes, legend values). */
export function formatRialCompact(value: unknown) {
	const n = toNum(value);
	if (n === null)
		return "";
	const abs = Math.abs(n);
	const sign = n < 0 ? "−" : "";
	const scaled = (divisor: number, unit: string) =>
		`${sign}${i18n.t(`dashboard.format.${unit}`, { value: formatNumber(abs / divisor, { maximumFractionDigits: 1 }) })}`;
	if (abs >= 1e9)
		return scaled(1e9, "billion");
	if (abs >= 1e6)
		return scaled(1e6, "million");
	if (abs >= 1e3)
		return scaled(1e3, "thousand");
	return `${sign}${formatNumber(abs)}`;
}

/** Percent as sent by the server (e.g. "30.00"), up to two fraction digits, no re-multiplication. */
export function formatPercent(value: unknown) {
	const n = toNum(value);
	return n === null ? "—" : `${formatNumber(n, { maximumFractionDigits: 2 })}٪`;
}

/** Year without thousands separator. */
export function formatYear(year: number) {
	return formatNumber(Number(year), { useGrouping: false });
}

export function pad2(n: number) {
	return formatNumber(Number(n), { minimumIntegerDigits: 2, useGrouping: false });
}
