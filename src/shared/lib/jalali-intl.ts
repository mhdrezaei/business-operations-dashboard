import { toPersianDigits } from "#src/utils/formated";

// `dayjs().calendar("jalali")` is shadowed by dayjs's `calendar` plugin once antd-jalali mounts,
// so Jalali values for display are read from Intl instead.
const JALALI_DATE_PATTERN = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
const JALALI_YEAR_RANGE = [1300, 1599];

export interface JalaliParts {
	year: number
	month: number
	day: number
}

const createPartsFormat = (timeZone?: string) => new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { year: "numeric", month: "numeric", day: "numeric", timeZone });
const localPartsFormat = createPartsFormat();
const utcPartsFormat = createPartsFormat("UTC");

/** Jalali year/month/day of a date; `utc` reads it in UTC so date-only ISO strings never shift with the user's timezone. */
export function getJalaliParts(date: Date, { utc = false } = {}): JalaliParts {
	const parts = Object.fromEntries((utc ? utcPartsFormat : localPartsFormat).formatToParts(date).map(part => [part.type, part.value]));
	return { year: Number.parseInt(parts.year, 10), month: Number(parts.month), day: Number(parts.day) };
}

export function getCurrentJalaliYear() {
	return getJalaliParts(new Date()).year;
}

/** "YYYY/MM/DD" with Persian digits. Accepts Jalali ("1404-04-01") or Gregorian ISO dates; anything else is returned as is. */
export function formatJalaliIsoDate(value: string) {
	const match = JALALI_DATE_PATTERN.exec(value);
	if (!match)
		return value;
	const [, year, month, day] = match;
	if (Number(year) >= JALALI_YEAR_RANGE[0] && Number(year) <= JALALI_YEAR_RANGE[1])
		return toPersianDigits(`${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")}`);
	const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00Z`);
	if (Number.isNaN(date.getTime()))
		return value;
	const parts = getJalaliParts(date, { utc: true });
	return toPersianDigits(`${parts.year}/${String(parts.month).padStart(2, "0")}/${String(parts.day).padStart(2, "0")}`);
}

const tehranDateTimeFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hourCycle: "h23",
	timeZone: "Asia/Tehran",
});

/** Backend timestamp (UTC; an offset-less value is treated as UTC) → Jalali date and Tehran time with Persian digits; "-" when empty or invalid. */
export function formatJalaliDateTime(value: unknown) {
	if (typeof value !== "string" || !value)
		return "-";
	const date = new Date(/(?:Z|[+-]\d\d:?\d\d)$/.test(value) ? value : `${value.replace(" ", "T")}Z`);
	return Number.isNaN(date.getTime()) ? "-" : tehranDateTimeFormat.format(date).replace(/[,،]/, "");
}

const DAY_MS = 86_400_000;
const GREGORIAN_ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Gregorian ISO date ("2025-08-06") → Jalali parts; null when it is not a real calendar date. */
export function gregorianIsoToJalaliParts(value: string): JalaliParts | null {
	const match = GREGORIAN_ISO_PATTERN.exec(value);
	if (!match)
		return null;
	const [year, month, day] = match.slice(1).map(Number);
	const date = new Date(Date.UTC(year, month - 1, day, 12));
	return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? getJalaliParts(date, { utc: true }) : null;
}

/** Jalali parts → Gregorian ISO date; null when the Jalali date does not exist. */
export function jalaliPartsToGregorianIso({ year, month, day }: JalaliParts): string | null {
	const estimate = Date.UTC(year + 621, 2, 21, 12) + Math.round((month - 1) * 30.5 + day - 1) * DAY_MS;
	for (const offset of [0, -1, 1, -2, 2, -3, 3]) {
		const date = new Date(estimate + offset * DAY_MS);
		const parts = getJalaliParts(date, { utc: true });
		if (parts.year === year && parts.month === month && parts.day === day)
			return date.toISOString().slice(0, 10);
	}
	return null;
}
