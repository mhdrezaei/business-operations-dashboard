import { z } from "zod";

export const shareholderSchema = z.object({
	full_name: z.string().trim().min(1, "نام سهامدار الزامی است"),
	national_id: z.string().trim().optional().or(z.literal("")),
	ownership_percent: z.string().trim().min(1, "درصد مالکیت الزامی است"),
	note: z.string().trim().optional().or(z.literal("")),
});
