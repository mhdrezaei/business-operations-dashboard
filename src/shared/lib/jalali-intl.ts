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
