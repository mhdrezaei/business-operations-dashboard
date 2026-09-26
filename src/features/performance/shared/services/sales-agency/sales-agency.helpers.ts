import type { PerformanceContractListItem } from "#src/features/performance/api/performances.api";
import { isYearMonthInRange } from "#src/features/performance/shared/model/performance.helpers";

export function hasSalesAgencyContractPeriod(contract: PerformanceContractListItem, year: number | null | undefined, month: number | null | undefined): boolean {
	if (year == null || month == null)
		return false;
	if (isYearMonthInRange(year, month, contract.start_jy, contract.start_jm, contract.end_jy, contract.end_jm))
		return true;
	return ((contract.addenda ?? contract.children ?? []) as PerformanceContractListItem[]).some(item => hasSalesAgencyContractPeriod(item, year, month));
}

export function salesAgencyCostTitles(contracts: PerformanceContractListItem[], year: number, month: number): string[] {
	for (const contract of contracts) {
		if (isYearMonthInRange(year, month, contract.start_jy, contract.start_jm, contract.end_jy, contract.end_jm)) {
			const titles = contract.cost_titles ?? contract.cost_title_names;
			if (Array.isArray(titles))
				return titles.filter((title): title is string => typeof title === "string");
		}
		const nested = salesAgencyCostTitles((contract.addenda ?? contract.children ?? []) as PerformanceContractListItem[], year, month);
		if (nested.length)
			return nested;
	}
	return [];
}
