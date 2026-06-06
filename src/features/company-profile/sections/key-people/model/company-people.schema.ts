import { z } from "zod";

const fullNameSchema = z
	.string()
	.trim()
	.min(1, "نام و نام خانوادگی خود را وارد کنید")
	.min(2, "نام و نام خانوادگی باید حداقل 2 کاراکتر باشد");

const nationalIdSchema = z.string().trim().min(1, "شناسه ملی را وارد کنید").regex(/^\d{10}$/, {
	message: "شناسه ملی باید 10 رقم باشد",
});

const titleSchema = z.string().trim().min(1, "عنوان را وارد کنید");

const optionalPhoneSchema = z.string().trim().refine(value => value === "" || /^09\d{9}$/.test(value), {
	message: "شماره تلفن باید با 09 شروع شود و 11 رقم باشد",
});

const optionalEmailSchema = z.string().trim().refine(value => value === "" || z.email().safeParse(value).success, {
	message: "ایمیل معتبر وارد کنید",
});

function requiredMultiField(itemSchema: z.ZodType<string>, requiredMessage: string) {
	return z
		.array(z.object({ value: itemSchema }))
		.default([])
		.superRefine((items: Array<{ value: string }>, ctx) => {
			const hasValue = items.some(item => item.value.trim() !== "");

			if (!hasValue) {
				ctx.addIssue({
					code: "custom",
					message: requiredMessage,
				});
			}
		});
}

export const companyPersonSchema = z.object({
	role: z.string().nullable(),
	full_name: fullNameSchema,
	is_signatory: z.boolean(),
	national_id: nationalIdSchema,
	title: titleSchema,
	phone: requiredMultiField(optionalPhoneSchema, "شماره تلفن را وارد کنید"),
	email: requiredMultiField(optionalEmailSchema, "ایمیل را وارد کنید"),
});
