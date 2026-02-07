export type SupportedLang = "fa-IR" | "en-US" | "de-DE" | string;

function normalizeDigitsToLatin(input: string) {
	// Persian/Arabic digits -> Latin
	const map: Record<string, string> = {
		"۰": "0",
		"۱": "1",
		"۲": "2",
		"۳": "3",
		"۴": "4",
		"۵": "5",
		"۶": "6",
		"۷": "7",
		"۸": "8",
		"۹": "9",
		"٠": "0",
		"١": "1",
		"٢": "2",
		"٣": "3",
		"٤": "4",
		"٥": "5",
		"٦": "6",
		"٧": "7",
		"٨": "8",
		"٩": "9",
	};
	// eslint-disable-next-line regexp/no-obscure-range
	return input.replace(/[۰-۹٠-٩]/g, d => map[d] ?? d);
}

export function formatNumberForLocale(n: number, language: SupportedLang) {
	try {
		return new Intl.NumberFormat(language).format(n);
	}
	catch {
		return String(n);
	}
}

// --- EN number to words (supports up to billions; enough for most admin forms)
const EN_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const EN_TEENS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function enBelowThousand(num: number): string {
	const parts: string[] = [];
	const h = Math.floor(num / 100);
	const r = num % 100;
	if (h)
		parts.push(`${EN_ONES[h]} hundred`);
	if (r) {
		if (r < 10) {
			parts.push(EN_ONES[r]);
		}
		else if (r < 20) {
			parts.push(EN_TEENS[r - 10]);
		}
		else {
			const t = Math.floor(r / 10);
			const o = r % 10;
			parts.push(o ? `${EN_TENS[t]}-${EN_ONES[o]}` : EN_TENS[t]);
		}
	}
	return parts.join(" ");
}

function numberToWordsEn(num: number): string {
	if (!Number.isFinite(num))
		return "";
	if (num === 0)
		return "zero";
	if (num < 0)
		return `minus ${numberToWordsEn(Math.abs(num))}`;

	const scales = [
		{ value: 1_000_000_000, name: "billion" },
		{ value: 1_000_000, name: "million" },
		{ value: 1_000, name: "thousand" },
	];

	let n = Math.floor(num);
	const parts: string[] = [];
	for (const s of scales) {
		if (n >= s.value) {
			const chunk = Math.floor(n / s.value);
			n = n % s.value;
			parts.push(`${enBelowThousand(chunk)} ${s.name}`);
		}
	}
	if (n)
		parts.push(enBelowThousand(n));
	return parts.join(" ").trim();
}

// --- FA number to words (supports up to billions similarly)
const FA_ONES = ["صفر", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const FA_TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const FA_TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const FA_HUNDREDS = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];

function faBelowThousand(num: number): string {
	const parts: string[] = [];
	const h = Math.floor(num / 100);
	const r = num % 100;
	if (h)
		parts.push(FA_HUNDREDS[h]);
	if (r) {
		if (r < 10) {
			parts.push(FA_ONES[r]);
		}
		else if (r < 20) {
			parts.push(FA_TEENS[r - 10]);
		}
		else {
			const t = Math.floor(r / 10);
			const o = r % 10;
			parts.push(o ? `${FA_TENS[t]} و ${FA_ONES[o]}` : FA_TENS[t]);
		}
	}
	return parts.join(" و ");
}

function numberToWordsFa(num: number): string {
	if (!Number.isFinite(num))
		return "";
	if (num === 0)
		return "صفر";
	if (num < 0)
		return `منفی ${numberToWordsFa(Math.abs(num))}`;

	const scales = [
		{ value: 1_000_000_000, name: "میلیارد" },
		{ value: 1_000_000, name: "میلیون" },
		{ value: 1_000, name: "هزار" },
	];

	let n = Math.floor(num);
	const parts: string[] = [];
	for (const s of scales) {
		if (n >= s.value) {
			const chunk = Math.floor(n / s.value);
			n = n % s.value;
			parts.push(`${faBelowThousand(chunk)} ${s.name}`);
		}
	}
	if (n)
		parts.push(faBelowThousand(n));
	return parts.join(" و ").trim();
}

export function numberToWordsByLanguage(raw: string, language: SupportedLang) {
	const normalized = normalizeDigitsToLatin(raw).replace(/,/g, "").trim();
	if (!normalized)
		return "";

	// فقط اعداد صحیح (برای فرم‌های مالی/سقف‌ها معمولاً همین کافی است)
	if (!/^-?\d+$/.test(normalized))
		return "";

	const n = Number(normalized);
	if (!Number.isFinite(n))
		return "";

	if (language === "fa-IR")
		return numberToWordsFa(n);
	// de-DE هم فعلاً انگلیسی نمایش می‌دیم (اگر خواستی آلمانی هم اضافه می‌کنیم)
	return numberToWordsEn(n);
}

export function sanitizeNumericInput(raw: string) {
	// اجازه: ارقام فارسی/عربی/لاتین + کاما + منفی (اختیاری)
	// تبدیل به رشته‌ی تمیز با ارقام لاتین و بدون کاراکتر اضافی
	const normalized = normalizeDigitsToLatin(raw);
	// فقط digits, comma, minus
	const cleaned = normalized.replace(/[^\d,-]/g, "");
	// فقط یک minus اول
	const minusFixed = cleaned.replace(/(?!^)-/g, "");
	// کاماهای اضافی را نگه می‌داریم (برای نمایش) یا می‌تونی حذف کنی
	return minusFixed;
}

export function stripGroupingSeparators(raw: string) {
	// حذف کاما/٬ و فاصله
	return raw.replace(/[,\u066C\u066B\u060C\s]/g, "");
}
export function formatWithGrouping(raw: string, language: SupportedLang) {
	// raw ممکنه شامل منفی و عدد باشد
	const normalized = normalizeDigitsToLatin(raw);
	const sign = normalized.startsWith("-") ? "-" : "";
	const digits = stripGroupingSeparators(normalized).replace(/^-/, "");

	if (!digits)
		return sign ? "-" : "";

	// فقط ارقام
	if (!/^\d+$/.test(digits))
		return sign + digits.replace(/\D/g, "");

	const n = Number(digits);
	if (!Number.isFinite(n))
		return sign + digits;

	// گروه‌بندی با locale (fa/en/de)
	const grouped = formatNumberForLocale(n, language);

	// اگر منفی بود، Intl خودش ممکنه منفی رو اضافه کنه؛ ما کنترل می‌کنیم
	return sign ? `-${grouped.replace(/^-/, "")}` : grouped;
}
