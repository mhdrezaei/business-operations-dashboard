import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { toPersianDigits } from "#src/utils/formated";

export function formatJalaliDate(value: string | null | undefined) {
	if (!value)
		return "-";
	const date = dayjs(value);
	return date.isValid() ? toPersianDigits(date.calendar("jalali").format("YYYY/MM/DD")) : value;
}
