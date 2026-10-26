import { z } from "zod";

export const REAL_START_MIN_YEAR = 1400;
export const REAL_START_MAX_YEAR = 1404;
export const REAL_START_TRIGGER_YEAR = 1404;
export const REAL_START_TRIGGER_MONTH = 4;
const REAL_START_LAST_MONTH_IN_MAX_YEAR = 3;
const FALLBACK_FIRST_YEAR = 1404;
const FALLBACK_YEARS_AHEAD = 5;

export function isRealStartTrigger(startYear: number | null | undefined, startMonth: number | null | undefined) {
	return startYear === REAL_START_TRIGGER_YEAR && startMonth === REAL_START_TRIGGER_MONTH;
}

export function getRealStartYears() {
	return Array.from(
		{ length: REAL_START_MAX_YEAR - REAL_START_MIN_YEAR + 1 },
		(_, idx) => REAL_START_MIN_YEAR + idx,
	);
}

export function getRealStartMonths(year: number | null | undefined) {
	const lastMonth = year === REAL_START_MAX_YEAR ? REAL_START_LAST_MONTH_IN_MAX_YEAR : 12;
	return Array.from({ length: lastMonth }, (_, idx) => idx + 1);
}

// `dayjs().calendar("jalali")` is shadowed by dayjs's `calendar` plugin once antd-jalali mounts, so read the year from Intl.
function getCurrentJalaliYear() {
	return Number(new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { year: "numeric" }).format(new Date()));
}

/** سال/ماه‌های قابل انتخاب وقتی گپ (gaps) لود نشده است؛ همان رفتار old: ۱۴۰۴ تا ۵ سال بعد، و در ۱۴۰۴ فقط تیر به بعد. */
export function buildFallbackMonthsByYear(currentJalaliYear = getCurrentJalaliYear()) {
	const output = new Map<number, number[]>();
	const lastYear = Math.max(currentJalaliYear + FALLBACK_YEARS_AHEAD, FALLBACK_FIRST_YEAR);
	for (let year = FALLBACK_FIRST_YEAR; year <= lastYear; year++) {
		const firstMonth = year === REAL_START_TRIGGER_YEAR ? REAL_START_LAST_MONTH_IN_MAX_YEAR + 1 : 1;
		output.set(year, Array.from({ length: 12 - firstMonth + 1 }, (_, idx) => firstMonth + idx));
	}
	return output;
}

export type RealStartIssue = "pair" | "min" | "max-year" | "max-month" | "trigger";

/** قواعد شروع واقعی (old: contract.schema.js)؛ هر دو خالی یعنی معتبر. */
export function validateRealStart(
	{ startYear, startMonth }: { startYear: number | null | undefined, startMonth: number | null | undefined },
	{ year, month }: { year: number | null | undefined, month: number | null | undefined },
): RealStartIssue | null {
	const hasYear = year != null;
	const hasMonth = month != null;
	if (!hasYear && !hasMonth)
		return null;
	if (hasYear !== hasMonth)
		return "pair";
	if (!isRealStartTrigger(startYear, startMonth))
		return "trigger";
	if (year! < REAL_START_MIN_YEAR)
		return "min";
	if (year! > REAL_START_MAX_YEAR)
		return "max-year";
	if (year === REAL_START_MAX_YEAR && month! > REAL_START_LAST_MONTH_IN_MAX_YEAR)
		return "max-month";
	return null;
}

export function mapRealStartPayload(
	{ startYear, startMonth }: { startYear: number | null | undefined, startMonth: number | null | undefined },
	{ year, month }: { year: unknown, month: unknown },
) {
	if (!isRealStartTrigger(startYear, startMonth) || year == null || year === "" || month == null || month === "")
		return null;
	return { real_start_jy: Number(year), real_start_jm: Number(month) };
}

/** فیلدهای شروع واقعی داخل serviceFields هر سرویس؛ با این schema در همه سرویس‌ها از strip شدن در امان می‌مانند. */
export const realStartFieldsSchema = z.object({
	realStartYear: z.unknown().optional(),
	realStartMonth: z.unknown().optional(),
});
