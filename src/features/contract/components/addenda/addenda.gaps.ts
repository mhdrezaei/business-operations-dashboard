export type AddendaMonthsByYear = Map<number, number[]>;

interface JalaliRange {
	startYear: number
	startMonth: number
	endYear: number
	endMonth: number
}

function normalizeMonths(months: unknown): number[] {
	if (!Array.isArray(months))
		return [];
	return [...new Set(months
		.map(Number)
		.filter(month => Number.isInteger(month) && month >= 1 && month <= 12))]
		.sort((a, b) => a - b);
}

export function buildAddendaMonthsByYear(
	missingMonthsByYear: Record<string, number[]> | undefined,
	currentContractRange?: JalaliRange | null,
): AddendaMonthsByYear {
	const result: AddendaMonthsByYear = new Map();
	Object.entries(missingMonthsByYear ?? {}).forEach(([yearValue, months]) => {
		const year = Number(yearValue);
		if (Number.isInteger(year))
			result.set(year, normalizeMonths(months));
	});

	if (!currentContractRange)
		return result;

	const { startYear, startMonth, endYear, endMonth } = currentContractRange;
	for (let year = startYear; year <= endYear; year++) {
		const firstMonth = year === startYear ? startMonth : 1;
		const lastMonth = year === endYear ? endMonth : 12;
		const months = new Set(result.get(year) ?? []);
		for (let month = firstMonth; month <= lastMonth; month++)
			months.add(month);
		result.set(year, [...months].sort((a, b) => a - b));
	}

	return result;
}

export function isAvailableAddendaMonth(
	monthsByYear: AddendaMonthsByYear,
	year: number,
	month: number,
): boolean {
	return monthsByYear.get(year)?.includes(month) ?? false;
}
