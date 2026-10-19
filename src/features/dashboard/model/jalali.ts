import type { ShPeriodRange } from "#src/features/dashboard/api/dashboard.dto";
import { i18n } from "#src/locales";

import { formatYear, pad2 } from "./format";

export interface YearMonth {
	year: number
	month: number
}

/** First selectable year of the dashboard pickers. */
export const FIRST_YEAR = 1404;
export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function monthName(month: number) {
	return i18n.t(`dashboard.months.${month}`);
}

/**
 * Jalali parts from the platform's Persian calendar (no dependency on which dayjs plugin owns `.calendar()`).
 * ISO dates are read as UTC midnight and formatted in UTC so the day never shifts with the user's timezone.
 */
const jalaliFormat = (timeZone?: string) => new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { year: "numeric", month: "numeric", day: "numeric", timeZone });
const localFormat = jalaliFormat();
const utcFormat = jalaliFormat("UTC");

function partsOf(format: Intl.DateTimeFormat, date: Date) {
	const parts = Object.fromEntries(format.formatToParts(date).map(p => [p.type, p.value]));
	return { year: Number.parseInt(parts.year, 10), month: Number(parts.month), day: Number(parts.day) };
}

export function getCurrentJalali(): YearMonth {
	const { year, month } = partsOf(localFormat, new Date());
	return { year, month };
}

const ISO_DATE = /^(\d{4}-\d{2}-\d{2})/;

function jalaliOf(isoDate: unknown) {
	const match = ISO_DATE.exec(String(isoDate ?? ""));
	if (!match)
		return null;
	const date = new Date(`${match[1]}T00:00:00Z`);
	return Number.isNaN(date.getTime()) ? null : partsOf(utcFormat, date);
}

/** Gregorian ISO date → Jalali year/month; invalid → null. */
export function jalaliPartsOf(isoDate: unknown): YearMonth | null {
	const d = jalaliOf(isoDate);
	return d ? { year: d.year, month: d.month } : null;
}

/** Gregorian ISO date → "۱۴۰۵/۰۷/۲۲"; invalid → null. */
export function jalaliFull(isoDate: unknown) {
	const d = jalaliOf(isoDate);
	return d ? `${formatYear(d.year)}/${pad2(d.month)}/${pad2(d.day)}` : null;
}

export function shiftJalaliMonth({ year, month }: YearMonth, delta: number): YearMonth {
	const index = year * 12 + (month - 1) + delta;
	return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function monthIndex({ year, month }: YearMonth) {
	return year * 12 + month;
}

export function buildShPeriodsRange(from: YearMonth, to: YearMonth, maxLength = 36) {
	const periods: YearMonth[] = [];
	let cursor = { ...from };
	while (periods.length < maxLength) {
		periods.push(cursor);
		if (cursor.year === to.year && cursor.month === to.month)
			break;
		cursor = shiftJalaliMonth(cursor, 1);
	}
	return periods;
}

export function shPeriodKey(year: number, month: number) {
	return `${year}-${month}`;
}

/** "مرداد ۱۴۰۵" */
export function jalaliMonthLabel(year: number, month: number) {
	return `${monthName(month)} ${formatYear(year)}`;
}

/** "مرداد ۱۴۰۵" | "فروردین تا خرداد ۱۴۰۵" | "دی ۱۴۰۴ تا مرداد ۱۴۰۵" */
export function periodRangeText(range: ShPeriodRange | null | undefined) {
	if (!range?.from || !range?.to)
		return null;
	const { from, to } = range;
	const end = jalaliMonthLabel(to.sh_year, to.sh_month);
	if (from.sh_year === to.sh_year && from.sh_month === to.sh_month)
		return end;
	const start = from.sh_year === to.sh_year ? monthName(from.sh_month) : jalaliMonthLabel(from.sh_year, from.sh_month);
	return i18n.t("dashboard.format.rangeTo", { start, end });
}

/** Full Jalali date of an ISO date, falling back to "month year" or "—". */
export function dateText(isoDate: unknown, shYear?: number | null, shMonth?: number | null) {
	return jalaliFull(isoDate) ?? (shYear && shMonth ? jalaliMonthLabel(shYear, shMonth) : "—");
}
