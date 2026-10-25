import { normalizeDigitsToLatin } from "#src/utils/formated";
import { z } from "zod";

export const shareholderSchema = z.object({
	full_name: z.string().trim().min(1, "نام سهامدار الزامی است"),
	national_id: z.string().trim().optional().or(z.literal("")),
	ownership_percent: z.string().trim().refine(
		value => value === "" || Number.isFinite(Number(normalizeDigitsToLatin(value))),
		"مقدار عددی برای «درصد مالکیت» معتبر نیست.",
	),
	note: z.string().trim().optional().or(z.literal("")),
});
