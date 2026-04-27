import { z } from "zod";

export function adminUserUpsertSchema(mode: "create" | "edit") {
	const rules = {
		username: z.string().trim().min(3, "نام کاربری الزامی است"),
		first_name: z.string().trim().min(3, "نام الزامی است"),
		last_name: z.string().trim().min(3, "نام خانوادگی الزامی است"),
		email: z
			.string()
			.min(1, "ایمیل الزامی است")
			.refine(
				val => /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(val),
				"ایمیل نامعتبر است",
			),
		mobile: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
		national_code: z.string().regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد"),
		is_active: z.boolean(),
		is_staff: z.boolean(),
		is_superuser: z.boolean(),
		password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
	};

	if (mode === "create") {
		return z.object({
			...rules,
			password: rules.password.nonempty("رمز عبور الزامی است"),
		});
	}

	// حالت ویرایش: همه فیلدها اختیاری می‌شوند
	const optionalString = (schema: z.ZodString) =>
		z.preprocess(val => (val === "" ? undefined : val), schema.optional());

	return z.object({
		username: optionalString(rules.username),
		first_name: optionalString(rules.first_name),
		last_name: optionalString(rules.last_name),
		email: optionalString(rules.email),
		mobile: optionalString(rules.mobile),
		national_code: optionalString(rules.national_code),
		is_active: rules.is_active.optional(),
		is_staff: rules.is_staff.optional(),
		is_superuser: rules.is_superuser.optional(),
		password: optionalString(rules.password),
	});
}
