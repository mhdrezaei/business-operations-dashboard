import type { ShPeriod } from "#src/features/dashboard/api/dashboard.dto";
import { jalaliMonthLabel } from "#src/features/dashboard/model/jalali";
import { i18n } from "#src/locales";

/** "مرداد ۱۴۰۵" | "دی ۱۴۰۴ تا مرداد ۱۴۰۵" — both ends always carry the year. */
export function periodsLabel(periods: ShPeriod[] | undefined) {
	if (!periods?.length)
		return "";
	const first = periods[0];
	const last = periods[periods.length - 1];
	const start = jalaliMonthLabel(first.sh_year, first.sh_month);
	const end = jalaliMonthLabel(last.sh_year, last.sh_month);
	return start === end ? start : i18n.t("dashboard.format.rangeTo", { start, end });
}
