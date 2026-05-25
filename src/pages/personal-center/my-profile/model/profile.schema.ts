import { z } from "zod";

const lettersOnlyPattern = /^[\p{L}\s]+$/u;
const emailPattern = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
const phoneNumberPattern = /^09(?:1\d|3\d|2\d|9\d)\d{7}$/;

// ====================== HELPER FUNCTIONS ======================

export function normalizeDigits(value: string): string {
	return value
		.replace(/[\u06F0-\u06F9]/g, digit => String(digit.charCodeAt(0) - 1776))
		.replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 1632));
}

export function keepLettersOnly(value: string): string {
	return Array.from(value).filter(char => /[\p{L}\s]/u.test(char)).join("");
}

export function keepDigitsOnly(value: string, maxLength: number): string {
	return normalizeDigits(value).replace(/\D/g, "").slice(0, maxLength);
}

export function sanitizeProfileFormValues(
	values: Partial<MyProfileFormValues> | undefined,
): Partial<MyProfileFormValues> {
	if (!values)
		return {};

	return {
		...values,
		username: values.username == null ? values.username : values.username.trim(),
		first_name: values.first_name == null ? values.first_name : keepLettersOnly(values.first_name),
		last_name: values.last_name == null ? values.last_name : keepLettersOnly(values.last_name),
		email: values.email == null ? values.email : values.email.trim(),
		mobile: values.mobile == null ? values.mobile : keepDigitsOnly(values.mobile, 11),
		national_code: values.national_code == null ? values.national_code : keepDigitsOnly(values.national_code, 10),
	};
}

// ====================== ERROR MESSAGES ======================

export const profileErrorMessages = {
	usernameRequired: "نام کاربری الزامی است",
	nameLettersOnly: "نام فقط باید شامل حروف باشد",
	lastNameLettersOnly: "نام خانوادگی فقط باید شامل حروف باشد",
	emailInvalid: "ساختار ایمیل درست نیست",
	mobileLength: "شماره موبایل باید 11 رقم باشد",
	nationalCodeLength: "کد ملی باید 10 رقم باشد",
	passwordsMismatch: "رمز جدید و تکرار آن مطابقت ندارد",
} as const;

// ====================== NORMALIZATION FOR DIRTY CHECK ======================

export function normalizeProfileValue(value: unknown): any {
	if (value === undefined || value === null)
		return null;
	if (typeof value === "string")
		return value.trim();
	if (typeof value === "number" || typeof value === "boolean")
		return value;
	if (Array.isArray(value))
		return value.map(normalizeProfileValue);
	if (value instanceof Date)
		return value.toISOString();
	if (typeof value === "object") {
		return Object.keys(value as Record<string, unknown>)
			.sort()
			.reduce<Record<string, any>>((result, key) => {
				result[key] = normalizeProfileValue((value as Record<string, unknown>)[key]);
				return result;
			}, {});
	}
	return String(value).trim();
}

export function mergeProfileValues(
	initial: MyProfileFormValues,
	current: Partial<MyProfileFormValues> | undefined,
): MyProfileFormValues {
	const definedCurrentValues = Object.fromEntries(
		Object.entries(current ?? {}).filter(([, v]) => v !== undefined),
	) as Partial<MyProfileFormValues>;

	return sanitizeProfileFormValues({ ...initial, ...definedCurrentValues }) as MyProfileFormValues;
}

export function getComparableProfileString(values: MyProfileFormValues): string {
	return JSON.stringify(normalizeProfileValue(sanitizeProfileFormValues(values)));
}

// ====================== SCHEMA WITH FULL VALIDATION ======================

export const myProfileUpsertSchema = z.object({
	username: z.string()
		.trim()
		.min(1, profileErrorMessages.usernameRequired)
		.nullable(),

	first_name: z.string()
		.transform(val => keepLettersOnly(val ?? ""))
		.refine(val => !val || lettersOnlyPattern.test(val), profileErrorMessages.nameLettersOnly)
		.nullable(),

	last_name: z.string()
		.transform(val => keepLettersOnly(val ?? ""))
		.refine(val => !val || lettersOnlyPattern.test(val), profileErrorMessages.lastNameLettersOnly)
		.nullable(),

	email: z.string()
		.transform(val => (val ?? "").trim())
		.refine(val => !val || emailPattern.test(val), profileErrorMessages.emailInvalid)
		.nullable(),

	mobile: z.string()
		.transform(val => keepDigitsOnly(val ?? "", 11))
		.refine(val => val.length === 0 || val.length === 11, profileErrorMessages.mobileLength)
		.refine(val => val.length === 0 || phoneNumberPattern.test(val), {
			message: "شماره موبایل وارد شده معتبر نیست",
		})
		.nullable(),

	national_code: z.string()
		.transform(val => keepDigitsOnly(val ?? "", 10))
		.refine(val => val.length === 0 || val.length === 10, profileErrorMessages.nationalCodeLength)
		.nullable(),

	password: z.string().optional(),
	newPassword: z.string().optional(),
	ConfirmNewPassword: z.string().optional(),
}).refine((data) => {
	if (data.newPassword && data.newPassword !== data.ConfirmNewPassword) {
		return false;
	}
	return true;
}, {
	message: profileErrorMessages.passwordsMismatch,
	path: ["ConfirmNewPassword"],
});

export type MyProfileFormValues = z.output<typeof myProfileUpsertSchema>;
