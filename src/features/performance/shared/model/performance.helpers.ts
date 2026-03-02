import type {
	PerformanceContractListItem,
	PerformanceContractServicePath,
	PerformanceListItem,
	PerformanceServicePath,
} from "#src/features/performance/api/performances.api";
import type { OpenApiContractModel, PerformanceServiceCode } from "./performance.form.types";

export function normalizeServiceCode(code: string | null | undefined) {
	return typeof code === "string" ? code.trim().toLowerCase() : "";
}

export function isSmsCommissionCode(code: string | null | undefined) {
	const normalized = normalizeServiceCode(code);
	return normalized === "sms-commission" || normalized === "sms_commission";
}

export function resolveContractServicePath(serviceCode: PerformanceServiceCode | null): PerformanceContractServicePath | null {
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

export function resolvePerformanceServicePath(serviceCode: PerformanceServiceCode | null): PerformanceServicePath | null {
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
		return "sms";

	return "openapi";
}

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

export function toNullableNumber(value: unknown): number | null {
	if (value == null || value === "")
		return null;
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

export function pickNumberFromRecord(record: Record<string, unknown>, keys: string[]): number | null {
	for (const key of keys) {
		const value = toNullableNumber(record[key]);
		if (value != null)
			return value;
	}
	return null;
}

export function pickStringFromRecord(record: Record<string, unknown>, keys: string[]): string | null {
	for (const key of keys) {
		const value = record[key];
		if (value == null)
			continue;
		const text = String(value).trim();
		if (text)
			return text;
	}
	return null;
}

export function normalizePerformanceRecord(record: PerformanceListItem | Record<string, unknown>) {
	const raw = record as Record<string, unknown>;
	return {
		raw,
		id: pickNumberFromRecord(raw, ["id"]),
		companyId: pickNumberFromRecord(raw, ["company", "company_id"]),
		serviceId: pickNumberFromRecord(raw, ["service", "service_id"]),
		year: pickNumberFromRecord(raw, ["sh_year", "year", "start_jy"]),
		month: pickNumberFromRecord(raw, ["sh_month", "month", "start_jm"]),
		salesAgentId: pickNumberFromRecord(raw, ["sales_agent", "sales_agent_id", "agent"]),
		companyType: pickStringFromRecord(raw, ["company_type"]),
		location: pickStringFromRecord(raw, ["location"]),
		operator: pickStringFromRecord(raw, ["operator"]),
		language: pickStringFromRecord(raw, ["language"]),
		operationType: pickStringFromRecord(raw, ["operation_type"]),
	};
}
