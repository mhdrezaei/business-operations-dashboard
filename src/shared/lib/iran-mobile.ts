import { normalizeDigitsToLatin } from "#src/utils/formated";

/** نمایش محلی: `09…` (ورودی می‌تواند `98…`، `0098…` یا ارقام فارسی باشد). */
export function normalizeIranMobile(value: string): string {
	const digits = normalizeDigitsToLatin(value).replace(/\D/g, "");

	if (digits.startsWith("0098"))
		return `0${digits.slice(4)}`;
	if (digits.startsWith("98"))
		return `0${digits.slice(2)}`;
	if (digits.startsWith("9") && digits.length === 10)
		return `0${digits}`;

	return digits;
}

/** فرمت ارسال به بک‌اند: `98…` یا null وقتی خالی است. */
export function toBackendMobile(value: string): string | null {
	const local = normalizeIranMobile(value);
	return local ? `98${local.replace(/^0/, "")}` : null;
}
