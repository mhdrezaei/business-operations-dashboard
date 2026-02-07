export const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => {
	const y = 1401 + i;
	return { label: String(y), value: y };
});

export const MONTH_OPTIONS = [
	{ label: "فروردین", value: 1 },
	{ label: "اردیبهشت", value: 2 },
	{ label: "خرداد", value: 3 },
	{ label: "تیر", value: 4 },
	{ label: "مرداد", value: 5 },
	{ label: "شهریور", value: 6 },
	{ label: "مهر", value: 7 },
	{ label: "آبان", value: 8 },
	{ label: "آذر", value: 9 },
	{ label: "دی", value: 10 },
	{ label: "بهمن", value: 11 },
	{ label: "اسفند", value: 12 },
];
