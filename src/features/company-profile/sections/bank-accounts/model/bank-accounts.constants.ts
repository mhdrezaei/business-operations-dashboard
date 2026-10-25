export const BANK_ACCOUNT_ORDERING_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "بانک (صعودی)", value: "bank_name" },
	{ label: "بانک (نزولی)", value: "-bank_name" },
	{ label: "شناسه (صعودی)", value: "id" },
	{ label: "شناسه (نزولی)", value: "-id" },
	{ label: "آخرین بروزرسانی (صعودی)", value: "updated_at" },
	{ label: "آخرین بروزرسانی (نزولی)", value: "-updated_at" },
];

export const BANK_CARD_NUMBER_LENGTH = 16;
export const BANK_IBAN_DIGITS_LENGTH = 24;

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeBankDigits(value: string) {
	return value
		.split("")
		.map((char) => {
			const persianIndex = PERSIAN_DIGITS.indexOf(char);
			if (persianIndex >= 0)
				return String(persianIndex);

			const arabicIndex = ARABIC_DIGITS.indexOf(char);
			if (arabicIndex >= 0)
				return String(arabicIndex);

			return char;
		})
		.join("");
}

export function normalizeCardNumber(value: string) {
	return normalizeBankDigits(value).replace(/\D/g, "").slice(0, BANK_CARD_NUMBER_LENGTH);
}

export function formatCardNumber(value: string) {
	return normalizeCardNumber(value).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function getIbanDigits(value: string) {
	return normalizeBankDigits(value)
		.toUpperCase()
		.replace(/\s+/g, "")
		.replace(/^IR/, "")
		.replace(/\D/g, "")
		.slice(0, BANK_IBAN_DIGITS_LENGTH);
}

export function normalizeIban(value: string) {
	const digits = getIbanDigits(value);
	return digits ? `IR${digits}` : "";
}

export function formatIban(value: string) {
	const normalized = normalizeIban(value);
	if (!normalized)
		return "IR";

	const body = normalized.slice(2);
	const groups = [
		body.slice(0, 2),
		body.slice(2, 6),
		body.slice(6, 10),
		body.slice(10, 14),
		body.slice(14, 18),
		body.slice(18, 22),
		body.slice(22, 24),
	].filter(Boolean);

	return `IR${groups.length ? `${groups[0]}-${groups.slice(1).join("-")}` : ""}`;
}
