import type { PerformanceContractListItem, PerformanceServicePath } from "#src/features/performance/api/performances.api";
import type { OpenApiContractModel, PerformanceServiceCode } from "./performance.form.types";

export function normalizeServiceCode(code: string | null | undefined) {
	return typeof code === "string" ? code.trim().toLowerCase() : "";
}

export function isSmsCommissionCode(code: string | null | undefined) {
	const normalized = normalizeServiceCode(code);
	return normalized === "sms-commission" || normalized === "sms_commission";
}

export function resolveContractServicePath(serviceCode: PerformanceServiceCode | null): PerformanceServicePath | null {
	const normalized = normalizeServiceCode(serviceCode);
	if (!normalized)
		return null;

	if (normalized === "psp")
		return "psp";
	if (normalized === "traffic")
		return "traffic";
	if (normalized === "shahkar")
		return "shahkar";
	if (normalized === "commercial")
		return "commercial";
	if (isSmsCommissionCode(normalized))
		return "sms-commission";
	if (normalized === "sms")
		return "sms/client";

	return "openapi";
}

export const resolvePerformanceServicePath = resolveContractServicePath;

export function compareYearMonth(aYear: number, aMonth: number, bYear: number, bMonth: number) {
	if (aYear !== bYear)
		return aYear - bYear;
	return aMonth - bMonth;
}

export function isYearMonthInRange(
	year: number,
	month: number,
	startYear: number | null | undefined,
	startMonth: number | null | undefined,
	endYear: number | null | undefined,
	endMonth: number | null | undefined,
) {
	if (
		startYear == null
		|| startMonth == null
		|| endYear == null
		|| endMonth == null
	) {
		return false;
	}

	return compareYearMonth(year, month, startYear, startMonth) >= 0 && compareYearMonth(year, month, endYear, endMonth) <= 0;
}

export function pickActiveContract(
	contracts: PerformanceContractListItem[],
	year: number | null | undefined,
	month: number | null | undefined,
) {
	if (year == null || month == null)
		return null;

	const sorted = [...contracts].sort((a, b) => {
		const ay = Number(a.start_jy ?? 0);
		const by = Number(b.start_jy ?? 0);
		if (ay !== by)
			return by - ay;
		const am = Number(a.start_jm ?? 0);
		const bm = Number(b.start_jm ?? 0);
		return bm - am;
	});

	return sorted.find(contract =>
		isYearMonthInRange(
			year,
			month,
			contract.start_jy,
			contract.start_jm,
			contract.end_jy,
			contract.end_jm,
		)) ?? null;
}

export function extractOpenApiContractModel(contract: PerformanceContractListItem | null): OpenApiContractModel | null {
	if (!contract)
		return null;

	const raw = contract.contract_openapi_details?.contract_model;
	const normalized = typeof raw === "string" ? raw.trim().toLowerCase() : "";

	if (normalized === "legacy")
		return "legacy";
	if (normalized === "package")
		return "package";
	return null;
}

export function extractSalesAgentId(contract: PerformanceContractListItem | null) {
	if (!contract)
		return null;

	const value = contract.sales_agent ?? contract.agent ?? null;
	const numeric = Number(value);
	return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

export function getFirstFileFromUploadField(value: unknown) {
	if (!Array.isArray(value) || value.length === 0)
		return null;

	const first = value[0] as { originFileObj?: File };
	return first?.originFileObj ?? null;
}
