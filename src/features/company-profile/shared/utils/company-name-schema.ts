import type { TFunction } from "i18next";
import { z } from "zod";

/** فیلدهای مشترک مودال‌های ایجاد/ویرایش شرکت. */
export function companyNameFields(t: TFunction) {
	return {
		company_type: z.string().nullable(),
		name: z.string().trim().min(2, t("companyProfile.nameRequired")),
		agent_name: z.string().trim(),
	};
}
