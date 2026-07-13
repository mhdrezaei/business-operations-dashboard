import { z } from "zod";

export function emptyToNull(v: unknown) {
	if (v === undefined || v === null || (typeof v === "string" && v.trim() === ""))
		return null;
	return v;
}

export function zNullableNumber(message: string) {
	return z.preprocess(
		emptyToNull,
		z.coerce.number({ message }).nullable(),
	);
}

export function zNullableInt(message: string) {
	return zNullableNumber(message).refine(
		v => v === null || Number.isInteger(v),
		{ message: "عدد صحیح وارد کنید" },
	);
}

export function zNullableNonNegative(message: string) {
	return zNullableNumber(message).refine(
		v => v === null || v >= 0,
		{ message },
	);
}

export function zNullablePercent(message: string) {
	return zNullableNumber(message).refine(
		v => v === null || (v >= 0 && v <= 100),
		{ message },
	);
}
