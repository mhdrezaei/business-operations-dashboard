import { z } from "zod";

/**
 * RHF + Input معمولاً مقدار خالی رو "" می‌دهد.
 * ما می‌خواهیم "" -> null شود تا با number|null سازگار باشد.
 */
export function emptyToNull(v: unknown) {
	if (v === "" || v === undefined || v === null)
		return null;
	return v;
}

/**
 * عدد nullable با preprocess:
 * - "" -> null
 * - "123" -> 123
 * - اگر عدد نامعتبر باشد خطا
 */
export function zNullableNumber(message: string) {
	return z.preprocess(
		emptyToNull,
		z.coerce.number({ message }).nullable(),
	);
}

/**
 * عدد صحیح nullable
 */
export function zNullableInt(message: string) {
	return zNullableNumber(message).refine(
		v => v === null || Number.isInteger(v),
		{ message: "عدد صحیح وارد کنید" },
	);
}

/**
 * عدد مثبت nullable (>= 0)
 */
export function zNullableNonNegative(message: string) {
	return zNullableNumber(message).refine(
		v => v === null || v >= 0,
		{ message },
	);
}

/**
 * درصد nullable (0..100)
 */
export function zNullablePercent(message: string) {
	return zNullableNumber(message).refine(
		v => v === null || (v >= 0 && v <= 100),
		{ message },
	);
}
