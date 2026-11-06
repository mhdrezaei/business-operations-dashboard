import { NO_ARABIC_SCRIPT_REGEXP, USERNAME_REGEXP } from "#src/constants/regular-expressions";
import { i18n } from "#src/locales";
import { normalizeIranMobile } from "#src/shared/lib/iran-mobile";
import { z } from "zod";

export function adminUserUpsertSchema(mode: "create" | "edit") {
	const englishOnly = i18n.t("form.password.invalid");
	const password = z.string().regex(NO_ARABIC_SCRIPT_REGEXP, englishOnly);

	return z.object({
		username: z.string().trim().min(1, "نام کاربری الزامی است").refine(val => !val || USERNAME_REGEXP.test(val), i18n.t("form.username.invalid")),
		email: z
			.string()
			.min(1, "ایمیل الزامی است")
			.refine(
				val => /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(val),
				"ایمیل نامعتبر است",
			),
		first_name: z.string().trim(),
		last_name: z.string().trim(),
		mobile: z.string().refine(val => /^(?:09\d{9})?$/.test(normalizeIranMobile(val)), "شماره موبایل معتبر نیست"),
		national_code: z.string().regex(/^(?:\d{10})?$/, "کد ملی باید ۱۰ رقم باشد"),
		is_active: z.boolean(),
		is_staff: z.boolean(),
		password: mode === "create" ? password.min(1, "رمز عبور الزامی است") : password.optional(),
		confirmPassword: password.optional(),
	}).refine(data => (data.password ?? "") === (data.confirmPassword ?? ""), {
		message: "رمز عبور و تکرار آن یکسان نیست",
		path: ["confirmPassword"],
	});
}

export type AdminUserFormValues = z.infer<ReturnType<typeof adminUserUpsertSchema>>;
