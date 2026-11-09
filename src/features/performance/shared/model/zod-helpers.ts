import i18next from "i18next";
import { z } from "zod";

export function emptyToNull(v: unknown) {
	if (v === "" || v == null)
		return null;
	return v;
}

export function zNullableNumber(message: string) {
	return z.preprocess(
		emptyToNull,
		z.coerce.number({ message }).nullable(),
	);
}

export function zNullableNonNegative(message: string) {
	return zNullableNumber(message).refine(
		v => v == null || v >= 0,
		{ message: i18next.t("performance.validation.base.negativeValue") },
	);
}
