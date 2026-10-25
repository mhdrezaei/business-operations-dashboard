import type { ProfilePayload } from "../api/profile.api";

import { NO_ARABIC_SCRIPT_REGEXP, USERNAME_REGEXP } from "#src/constants/regular-expressions";
import { i18n } from "#src/locales";
import { normalizeIranMobile } from "#src/shared/lib/iran-mobile";
import { z } from "zod";

const lettersOnlyPattern = /^[\p{L}\s]+$/u;
const letterInputPattern = /^[\p{L}\s]$/u;
const digitInputPattern = /^[0-9\u06F0-\u06F9\u0660-\u0669]$/;
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

type ProfileInputKind = "letters" | "digits";

interface ProfileInputKeyGuardOptions {
	key: string
	value?: string
	selectionStart?: number | null
	selectionEnd?: number | null
	maxLength?: number
	ctrlKey?: boolean
	metaKey?: boolean
	altKey?: boolean
}

export function shouldPreventProfileInputKey(
	kind: ProfileInputKind,
	options: ProfileInputKeyGuardOptions,
): boolean {
	if (options.ctrlKey || options.metaKey || options.altKey)
		return false;
	if (options.key.length !== 1)
		return false;

	if (kind === "letters")
		return !letterInputPattern.test(options.key);

	if (!digitInputPattern.test(options.key))
		return true;

	if (options.maxLength == null)
		return false;

	const value = options.value ?? "";
	const selectionStart = options.selectionStart ?? value.length;
	const selectionEnd = options.selectionEnd ?? selectionStart;
	const selectedLength = Math.max(selectionEnd - selectionStart, 0);
	const nextLength = normalizeDigits(value).length - selectedLength + normalizeDigits(options.key).length;

	return nextLength > options.maxLength;
}

export function sanitizeProfileInputValue(
	kind: ProfileInputKind,
	value: string,
	maxLength?: number,
): string {
	if (kind === "letters")
		return keepLettersOnly(value);

	return keepDigitsOnly(value, maxLength ?? value.length);
}

export function sanitizeProfileFormValues(
	values: Partial<MyProfileFormValues> | undefined,
): Partial<MyProfileFormValues> {
	if (!values)
		return {};

	return {
		...values,
		username: values.username == null ? values.username : values.username.trim(),
		first_name: values.first_name == null ? values.first_name : sanitizeProfileInputValue("letters", values.first_name),
		last_name: values.last_name == null ? values.last_name : sanitizeProfileInputValue("letters", values.last_name),
		email: values.email == null ? values.email : values.email.trim(),
		mobile: values.mobile == null ? values.mobile : normalizeIranMobile(values.mobile).slice(0, 11),
		national_code: values.national_code == null ? values.national_code : sanitizeProfileInputValue("digits", values.national_code, 10),
	};
}

// ====================== ERROR MESSAGES ======================

// پیام مشترک با فرم کاربر ادمین (کلید i18n)؛ lazy تا در زمان import به آماده‌بودن i18n وابسته نباشد
const englishOnlyMessage = { error: () => i18n.t("form.password.invalid") };

export const profileErrorMessages = {
	usernameRequired: "نام کاربری الزامی است",
	nameLettersOnly: "نام فقط باید شامل حروف باشد",
	lastNameLettersOnly: "نام خانوادگی فقط باید شامل حروف باشد",
	emailInvalid: "ساختار ایمیل درست نیست",
	mobileLength: "شماره موبایل باید 11 رقم باشد",
	nationalCodeLength: "کد ملی باید 10 رقم باشد",
	passwordsMismatch: "رمز جدید و تکرار آن مطابقت ندارد",
	passwordPairRequired: "برای تغییر رمز، هر دو فیلد رمز فعلی و رمز جدید باید پر شوند.",
	mobileChangeAlone: "برای تغییر شماره موبایل، ابتدا فقط شماره را ذخیره کنید و بعد سایر اطلاعات را تغییر دهید.",
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

function isRepeatedDigits(value: string): boolean {
	return /^(\d)\1+$/.test(value);
}

// ====================== SCHEMA WITH FULL VALIDATION ======================

export const myProfileUpsertSchema = z.object({
	username: z.string()
		.trim()
		.min(1, profileErrorMessages.usernameRequired)
		.regex(USERNAME_REGEXP, { error: () => i18n.t("form.username.invalid") })
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
		.transform(val => normalizeIranMobile(val ?? "").slice(0, 11))
		.refine(val => val.length === 0 || val.length === 11, profileErrorMessages.mobileLength)
		.refine(val => val.length === 0 || phoneNumberPattern.test(val), {
			message: "شماره موبایل وارد شده معتبر نیست",
		})
		.nullable(),

	national_code: z.string()
		.transform(val => keepDigitsOnly(val ?? "", 10))
		.refine(val => val.length === 0 || val.length === 10, profileErrorMessages.nationalCodeLength)
		.refine(val => val.length === 0 || !isRepeatedDigits(val), {
			message: "کد ملی وارد شده معتبر نیست",
		})
		.nullable(),

	password: z.string().regex(NO_ARABIC_SCRIPT_REGEXP, englishOnlyMessage).optional(),
	newPassword: z.string().regex(NO_ARABIC_SCRIPT_REGEXP, englishOnlyMessage).optional(),
	ConfirmNewPassword: z.string().regex(NO_ARABIC_SCRIPT_REGEXP, englishOnlyMessage).optional(),
}).refine(data => Boolean(data.password) === Boolean(data.newPassword), {
	message: profileErrorMessages.passwordPairRequired,
	path: ["newPassword"],
}).refine(data => !data.newPassword || data.newPassword === data.ConfirmNewPassword, {
	message: profileErrorMessages.passwordsMismatch,
	path: ["ConfirmNewPassword"],
});

function emptyToNull(value: string | null | undefined): string | null {
	return value?.trim() || null;
}

/** مقادیر خالی null می‌شوند؛ رمز فقط وقتی هر دو فیلد پر باشند ارسال می‌شود؛ موبایل جداگانه (OTP) می‌رود. */
export function buildProfileUpdatePayload(profile: MyProfileFormValues): ProfilePayload {
	return {
		username: profile.username?.trim(),
		first_name: emptyToNull(profile.first_name),
		last_name: emptyToNull(profile.last_name),
		email: emptyToNull(profile.email),
		national_code: emptyToNull(profile.national_code),
		...(profile.password && profile.newPassword
			? { current_password: profile.password, new_password: profile.newPassword }
			: {}),
	};
}

export function hasNonMobileProfileChanges(initial: MyProfileFormValues, current: MyProfileFormValues): boolean {
	const text = (value: string | null | undefined) => value?.trim() ?? "";
	return (["username", "first_name", "last_name", "email", "national_code"] as const)
		.some(key => text(current[key]) !== text(initial[key]))
		|| Boolean(current.password || current.newPassword || current.ConfirmNewPassword);
}

export type MyProfileFormValues = z.output<typeof myProfileUpsertSchema>;
