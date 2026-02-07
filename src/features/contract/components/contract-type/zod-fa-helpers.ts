import { z } from "zod";

export function zNullableNumberFa(requiredMsg?: string) {
	return z.preprocess((v) => {
		if (v === "" || v == null)
			return null;
		if (typeof v === "string") {
			const t = v.trim();
			if (!t)
				return null;
			const n = Number(t);
			return Number.isFinite(n) ? n : v;
		}
		return v;
	}, z.number().nullable()).superRefine((val, ctx) => {
		// اگر می‌خواهی required باشد:
		if (requiredMsg && val == null) {
			ctx.addIssue({ code: "custom", message: requiredMsg });
		}
	});
}

export function zNullableArrayFa<T extends z.ZodTypeAny>(item: T) {
	return z.preprocess(v => (Array.isArray(v) ? v : []), z.array(item));
}
