import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { toPersianDigits } from "#src/utils/formated";

export function formatHistoryDate(value: string) {
	const date = dayjs(value);
	return toPersianDigits(date.isValid() ? date.format("YYYY/MM/DD - HH:mm") : value);
}
