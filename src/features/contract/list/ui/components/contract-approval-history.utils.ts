import { dayjs } from "#src/shared/lib/dayjs-jalali";

export function toPersianDigits(value: string) {
	return value.replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

export function formatHistoryDate(value: string) {
	const date = dayjs(value);
	return toPersianDigits(date.isValid() ? date.format("YYYY/MM/DD - HH:mm") : value);
}
