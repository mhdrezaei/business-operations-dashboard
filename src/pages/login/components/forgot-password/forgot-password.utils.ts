// تبدیل اعداد فارسی/عربی به انگلیسی + حذف فاصله/خط تیره
export function normalizeDigits(input: string) {
	const fa = "۰۱۲۳۴۵۶۷۸۹";
	const ar = "٠١٢٣٤٥٦٧٨٩";
	let s = input ?? "";
	// eslint-disable-next-line regexp/no-obscure-range
	s = s.replace(/[۰-۹]/g, d => String(fa.indexOf(d)));
	// eslint-disable-next-line regexp/no-obscure-range
	s = s.replace(/[٠-٩]/g, d => String(ar.indexOf(d)));
	s = s.replace(/[\s-]/g, "");
	return s;
}

// خروجی برای API: ترجیحاً 09xxxxxxxxx
export function toApiMobile(raw: string) {
	const s = normalizeDigits(raw);

	// +98 / 0098 / 98
	if (s.startsWith("+98"))
		return `0${s.slice(3)}`;
	if (s.startsWith("0098"))
		return `0${s.slice(4)}`;
	if (s.startsWith("98"))
		return `0${s.slice(2)}`;

	// 9xxxxxxxxx
	if (s.startsWith("9") && s.length === 10)
		return `0${s}`;

	return s;
}
