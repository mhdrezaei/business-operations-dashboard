import type { TFunction } from "i18next";
import { z } from "zod";

/** فیلدهای مشترک مودال‌های ایجاد/ویرایش شرکت. */
export function companyNameFields(t: TFunction) {
	return {
		company_type: z.string().nullable(),
		name: z.string().trim().min(1, t("companyProfile.nameRequired")).min(2, t("companyProfile.nameTooShort")).max(200, t("companyProfile.nameTooLong")),
		agent_name: z.string().trim(),
	};
}
