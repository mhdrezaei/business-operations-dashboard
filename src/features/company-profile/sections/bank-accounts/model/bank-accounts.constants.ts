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

const BANK_NAME_BY_CARD_PREFIX = new Map<string, string>([
	["502229", "بانک پاسارگاد"],
	["502806", "بانک شهر"],
	["502908", "بانک توسعه تعاون"],
	["502938", "بانک دی"],
	["504172", "بانک قرض الحسنه رسالت"],
	["504706", "بانک شهر"],
	["505416", "بانک گردشگری"],
	["505785", "بانک ایران زمین"],
	["505809", "بانک خاورمیانه"],
	["581874", "بانک ایران ونزوئلا"],
	["589210", "بانک سپه"],
	["589463", "بانک رفاه کارگران"],
	["603769", "بانک صادرات ایران"],
	["603770", "بانک کشاورزی"],
	["603799", "بانک ملی ایران"],
	["610433", "بانک ملت"],
	["621986", "بانک سامان"],
	["622106", "بانک پارسیان"],
	["627353", "بانک تجارت"],
	["627381", "بانک انصار"],
	["627412", "بانک اقتصاد نوین"],
	["627488", "بانک کارآفرین"],
	["627648", "بانک توسعه صادرات ایران"],
	["627760", "پست بانک ایران"],
	["627961", "بانک صنعت و معدن"],
	["628023", "بانک مسکن"],
	["636214", "بانک آینده"],
	["636795", "بانک مرکزی جمهوری اسلامی ایران"],
	["636949", "بانک حکمت ایرانیان"],
	["639346", "بانک سینا"],
	["639347", "بانک سینا"],
	["639370", "بانک مهر اقتصاد"],
	["639599", "بانک قوامین"],
	["639607", "بانک سرمایه"],
]);

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

export function detectBankNameByCardNumber(value: string) {
	const prefix = normalizeCardNumber(value).slice(0, 6);
	return prefix.length === 6 ? (BANK_NAME_BY_CARD_PREFIX.get(prefix) ?? "") : "";
}
