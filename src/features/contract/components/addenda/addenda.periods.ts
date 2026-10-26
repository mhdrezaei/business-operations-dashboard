export type AddendaMonthsByYear = Map<number, number[]>;

export interface AddendumPeriodRange {
	startYear: number
	startMonth: number
	endYear: number
	endMonth: number
}

export type AddendumPeriodIssueCode = "invalid-range" | "start-outside-parent" | "overlap";

export interface AddendumPeriodIssue {
	path: Array<string | number>
	code: AddendumPeriodIssueCode
}

/** در old فقط یک ماه بعد از پایان والد برای شروع الحاقیه مجاز است. */
const MAX_CHILD_START_SLOTS = 1;

function toNumber(value: unknown) {
	if (value == null || value === "")
		return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

export function periodKey(year: unknown, month: unknown) {
	const y = toNumber(year);
	const m = toNumber(month);
	return y == null || m == null ? null : y * 100 + m;
}

function nextPeriodKey(key: number) {
	const year = Math.floor(key / 100);
	const month = key % 100;
	return month >= 12 ? (year + 1) * 100 + 1 : key + 1;
}

export function toAddendumRange(source: { startYear?: unknown, startMonth?: unknown, endYear?: unknown, endMonth?: unknown } | null | undefined): AddendumPeriodRange | null {
	const start = periodKey(source?.startYear, source?.startMonth);
	const end = periodKey(source?.endYear, source?.endMonth);
	if (start == null || end == null || start > end)
		return null;
	return {
		startYear: Number(source?.startYear),
		startMonth: Number(source?.startMonth),
		endYear: Number(source?.endYear),
		endMonth: Number(source?.endMonth),
	};
}

/** ماه‌های مجاز برای شروع الحاقیه: داخل بازه والد، یا دقیقاً ماه بعد از پایان والد (old: buildAllowedAddendumStartMap). */
export function buildAllowedStartMonths(parent: AddendumPeriodRange | null): AddendaMonthsByYear {
	const result: AddendaMonthsByYear = new Map();
	if (!parent)
		return result;

	const first = periodKey(parent.startYear, parent.startMonth)!;
	const last = periodKey(parent.endYear, parent.endMonth)!;
	let key = first;
	let slotsAfterEnd = 0;
	while (key <= last || slotsAfterEnd < MAX_CHILD_START_SLOTS) {
		if (key > last)
			slotsAfterEnd++;
		const year = Math.floor(key / 100);
		result.set(year, [...(result.get(year) ?? []), key % 100]);
		key = nextPeriodKey(key);
	}
	return result;
}

export function isAllowedAddendumStart(monthsByYear: AddendaMonthsByYear, year: unknown, month: unknown) {
	const y = toNumber(year);
	const m = toNumber(month);
	return y != null && m != null && (monthsByYear.get(y)?.includes(m) ?? false);
}

/** ماه‌های مجاز پایان: در سال شروع فقط از ماه شروع به بعد (old: buildEndMonthOptions). */
export function getAddendumEndMonths(endYear: unknown, startYear: unknown, startMonth: unknown) {
	const year = toNumber(endYear);
	if (year == null)
		return [];
	const firstMonth = year === toNumber(startYear) ? toNumber(startMonth) ?? 1 : 1;
	return Array.from({ length: 12 - firstMonth + 1 }, (_, idx) => firstMonth + idx);
}

/** تاریخ‌های پیش‌فرض الحاقیه جدید: همان بازه آخرین هم‌سطح، وگرنه اولین ماه مجاز (old: handleAdd). */
export function buildDefaultAddendumPeriod(parent: AddendumPeriodRange, lastSibling?: Record<string, unknown> | null) {
	const monthsByYear = buildAllowedStartMonths(parent);
	const firstYear = [...monthsByYear.keys()].find(year => (monthsByYear.get(year)?.length ?? 0) > 0);
	const firstMonth = firstYear == null ? null : monthsByYear.get(firstYear)![0];
	const startYear = toNumber(lastSibling?.startYear) ?? firstYear ?? parent.startYear;
	const startMonth = toNumber(lastSibling?.startMonth) ?? firstMonth ?? parent.startMonth;
	return {
		startYear,
		startMonth,
		endYear: toNumber(lastSibling?.endYear) ?? toNumber(lastSibling?.startYear) ?? firstYear ?? parent.endYear,
		endMonth: toNumber(lastSibling?.endMonth) ?? toNumber(lastSibling?.startMonth) ?? firstMonth ?? parent.endMonth,
	};
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
	return aStart <= bEnd && aEnd >= bStart;
}

/**
 * قواعد old (validateNestedAddendaPeriods) روی درخت الحاقیه‌ها:
 * شروع هر الحاقیه داخل بازه والد یا ماه بعد از پایان والد، و الحاقیه‌های هم‌سطح هم‌پوشانی ندارند.
 * `parent` برای ریشه بازه قرارداد اصلی است؛ اگر کامل نباشد فقط هم‌پوشانی بررسی می‌شود.
 */
export function validateAddendaPeriods(
	addenda: unknown,
	parent: AddendumPeriodRange | null,
	path: Array<string | number>,
): AddendumPeriodIssue[] {
	const issues: AddendumPeriodIssue[] = [];
	const items = (Array.isArray(addenda) ? addenda : []) as Array<Record<string, unknown> | null>;
	const allowedStarts = buildAllowedStartMonths(parent);
	const ranges: Array<{ index: number, start: number, end: number }> = [];

	items.forEach((item, index) => {
		const start = periodKey(item?.startYear, item?.startMonth);
		const end = periodKey(item?.endYear, item?.endMonth);
		if (start == null || end == null)
			return;

		if (start > end) {
			issues.push({ path: [...path, index, "startYear"], code: "invalid-range" });
		}
		else {
			ranges.push({ index, start, end });
			if (parent && !isAllowedAddendumStart(allowedStarts, item?.startYear, item?.startMonth))
				issues.push({ path: [...path, index, "startYear"], code: "start-outside-parent" });
		}

		issues.push(...validateAddendaPeriods(item?.children, toAddendumRange(item), [...path, index, "children"]));
	});

	ranges.forEach((current, i) => {
		ranges.slice(i + 1).forEach((next) => {
			if (overlaps(current.start, current.end, next.start, next.end))
				issues.push({ path: [...path, next.index, "startYear"], code: "overlap" });
		});
	});

	return issues;
}
