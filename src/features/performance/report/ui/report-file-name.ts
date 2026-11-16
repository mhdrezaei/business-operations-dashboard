import type { TFunction } from "i18next";
import { normalizeDigitsToLatin } from "#src/utils/formated";

export interface FileNamePeriod {
	year: number
	/** Month (1-12) or quarter (1-4) inside the year. */
	value: number
}

export interface FileNamePeriodFormat {
	unitsPerYear: number
	unitLabel: (value: number) => string
	countLabel: (count: number, year: number) => string
}

const MAX_FILE_NAME_LENGTH = 80;
const MAX_LISTED_PERIODS = 3;
const FORBIDDEN_CHARACTERS = /[\\/:*?"<>|]/g;

export function createFileNamePeriodFormat(unit: "month" | "quarter", unitLabel: (value: number) => string, t: TFunction): FileNamePeriodFormat {
	return {
		unitsPerYear: unit === "month" ? 12 : 4,
		unitLabel,
		countLabel: (count, year) => t(unit === "month" ? "performance.fileName.monthsOfYear" : "performance.fileName.quartersOfYear", { count, year }),
	};
}

export function parseReportPeriodKey(key: string): FileNamePeriod | null {
	const [yearRaw, valueRaw] = key.split("-");
	const year = Number(yearRaw);
	const value = Number(valueRaw);
	return Number.isInteger(year) && Number.isInteger(value) && value >= 1 ? { year, value } : null;
}

function toSortedUnique(periods: FileNamePeriod[], unitsPerYear: number) {
	const byIndex = new Map(periods.map(period => [period.year * unitsPerYear + period.value, period]));
	return [...byIndex.entries()].sort(([first], [second]) => first - second);
}

function formatCompactPeriod({ year, value }: FileNamePeriod) {
	return `${year}-${String(value).padStart(2, "0")}`;
}

/** One period, a consecutive run, a short list or a count: never more than a handful of words. */
export function formatPeriodsForFileName(periods: FileNamePeriod[], format: FileNamePeriodFormat) {
	const sorted = toSortedUnique(periods, format.unitsPerYear);
	if (sorted.length === 0)
		return "";

	const [firstIndex, first] = sorted[0];
	const [lastIndex, last] = sorted[sorted.length - 1];
	const sameYear = first.year === last.year;
	if (sorted.length === 1)
		return `${format.unitLabel(first.value)} ${first.year}`;

	const consecutive = lastIndex - firstIndex === sorted.length - 1;
	if (!sameYear)
		return `${formatCompactPeriod(first)} تا ${formatCompactPeriod(last)}`;
	if (consecutive)
		return `${format.unitLabel(first.value)} تا ${format.unitLabel(last.value)} ${first.year}`;
	if (sorted.length <= MAX_LISTED_PERIODS)
		return `${sorted.map(([, period]) => format.unitLabel(period.value)).join("، ")} ${first.year}`;
	return format.countLabel(sorted.length, first.year);
}

/** Cuts the service part with an ellipsis; the title and period always stay whole. */
export function buildReportFileName(parts: { title: string, service?: string | null, period?: string | null }, extension: string) {
	const clean = (text: string | null | undefined) =>
		normalizeDigitsToLatin(text ?? "").replace(FORBIDDEN_CHARACTERS, " ").replace(/\s+/g, " ").trim();
	const title = clean(parts.title);
	const period = clean(parts.period);
	let service = clean(parts.service);

	const compose = () => [title, service, period].filter(Boolean).join(" - ");
	const overflow = compose().length - MAX_FILE_NAME_LENGTH;
	if (overflow > 0 && service) {
		const keep = Math.max(service.length - overflow - 1, 3);
		service = `${service.slice(0, keep).trimEnd()}…`;
	}
	return `${compose()}.${extension}`;
}

/** Print dialogs use the window title as the suggested PDF file name. */
export function buildReportPrintTitle(parts: Parameters<typeof buildReportFileName>[0]) {
	return buildReportFileName(parts, "pdf").slice(0, -".pdf".length);
}
