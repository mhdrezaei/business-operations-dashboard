import { z } from "zod";

const optionalNationalIdSchema = z.string().trim().refine(value => value === "" || /^\d{10}$/.test(value), {
	message: "شناسه ملی باید 10 رقم باشد",
});

const optionalPhoneSchema = z.string().trim().refine(value => value === "" || /^09\d{9}$/.test(value), {
	message: "شماره تلفن باید با 09 شروع شود و 11 رقم باشد",
});

const optionalEmailSchema = z.string().trim().refine(value => value === "" || z.email().safeParse(value).success, {
	message: "ایمیل معتبر وارد کنید",
});

export const companyPersonSchema = z.object({
	role: z.string().nullable(),
	full_name: z.string().trim().min(1, "نام و نام خانوادگی الزامی است."),
	is_signatory: z.boolean(),
	national_id: optionalNationalIdSchema,
	title: z.string(),
	gender: z.enum(["MALE", "FEMALE"]).nullish(),
	official_gazette_number: z.string().trim().max(64, "شماره روزنامه رسمی حداکثر 64 کاراکتر است"),
	official_gazette_date: z.string(),
	phone: z.array(z.object({ value: optionalPhoneSchema })),
	email: z.array(z.object({ value: optionalEmailSchema })),
});
