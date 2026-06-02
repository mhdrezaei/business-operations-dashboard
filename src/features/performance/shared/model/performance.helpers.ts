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

function normalizeCompanyTypeToken(value: unknown): string | null {
	if (typeof value !== "string")
		return null;
	const normalized = value.trim().toUpperCase();
	return normalized || null;
}

function toCompanyTypeTokens(value: unknown): string[] {
	if (value == null)
		return [];

	if (typeof value === "string") {
		const normalized = normalizeCompanyTypeToken(value);
		return normalized ? [normalized] : [];
	}

	if (typeof value === "object" && !Array.isArray(value)) {
		const obj = value as Record<string, unknown>;
		const keyTokens = Object.keys(obj)
			.map(token => normalizeCompanyTypeToken(token))
			.filter((token): token is string => Boolean(token));
		const valueTokens = Object.values(obj)
			.map(token => normalizeCompanyTypeToken(token))
			.filter((token): token is string => Boolean(token));
		return Array.from(new Set([...keyTokens, ...valueTokens]));
	}

	return [];
}

export function companyTypeMatches(companyType: unknown, selectedType: string | null | undefined): boolean {
	const selectedToken = normalizeCompanyTypeToken(selectedType);
	if (!selectedToken)
		return false;

	return toCompanyTypeTokens(companyType).includes(selectedToken);
}

export function pickCompanyTypeToken(companyType: unknown): string | null {
	const [first] = toCompanyTypeTokens(companyType);
	return first ?? null;
}

export function isSmsCommissionCode(code: string | null | undefined) {
	const normalized = normalizeServiceCode(code);
	return normalized === "sms-commission" || normalized === "sms_commission";
}

export function shouldAggregatePerformanceRows(service: PerformanceServicePath | null | undefined) {
	return service === "openapi" || service === "sms" || service === "sms-commission" || service === "traffic";
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
	return normalizeOpenApiContractModel(contract?.contract_openapi_details?.contract_model);
}

export function normalizeOpenApiContractModel(raw: unknown): OpenApiContractModel | null {
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
		companyType: pickCompanyTypeToken(raw.company_type),
		location: pickStringFromRecord(raw, ["location"]),
		operator: pickStringFromRecord(raw, ["operator"]),
		language: pickStringFromRecord(raw, ["language"]),
		operationType: pickStringFromRecord(raw, ["operation_type"]),
	};
}

function buildAggregatedPerformanceRowKey(service: PerformanceServicePath, record: PerformanceListItem) {
	const normalized = normalizePerformanceRecord(record);
	const base = [
		service,
		normalized.companyId ?? "company",
		normalized.serviceId ?? "service",
		normalized.year ?? "year",
		normalized.month ?? "month",
	];

	if (service === "sms-commission")
		base.push(normalized.salesAgentId ?? "sales-agent");
	if (service === "traffic")
		base.push(normalized.companyType ?? "company-type");

	return base.join(":");
}

function sumPerformanceField(currentValue: unknown, nextValue: unknown) {
	const current = toNullableNumber(currentValue) ?? 0;
	const next = toNullableNumber(nextValue) ?? 0;
	return current + next;
}

export function aggregatePerformanceRows(
	service: PerformanceServicePath,
	rows: PerformanceListItem[],
) {
	if (!shouldAggregatePerformanceRows(service))
		return rows;

	const grouped = new Map<string, PerformanceListItem>();

	rows.forEach((row) => {
		const key = buildAggregatedPerformanceRowKey(service, row);
		const existing = grouped.get(key);
		if (!existing) {
			grouped.set(key, {
				...row,
				operation_type: null,
				operator: null,
				language: null,
				location: service === "traffic" ? null : row.location,
				traffic_locations: service === "traffic" ? [row] : undefined,
			});
			return;
		}

		if (service === "traffic") {
			const trafficLocations = Array.isArray((existing as Record<string, unknown>).traffic_locations)
				? (existing as Record<string, unknown>).traffic_locations as PerformanceListItem[]
				: [];
			(existing as Record<string, unknown>).traffic_locations = [...trafficLocations, row];
		}

		existing.value = sumPerformanceField(existing.value, row.value);
		existing.income = sumPerformanceField(existing.income, row.income);
		existing.expense = sumPerformanceField(existing.expense, row.expense);
		existing.profit = sumPerformanceField(existing.profit, row.profit);
		existing.value_receive = sumPerformanceField(existing.value_receive, row.value_receive);

		if (existing.company_name == null && row.company_name != null)
			existing.company_name = row.company_name;
		if (existing.service_name == null && row.service_name != null)
			existing.service_name = row.service_name;
		if (existing.sales_agent_name == null && row.sales_agent_name != null)
			existing.sales_agent_name = row.sales_agent_name;
		if (existing.is_official == null && row.is_official != null)
			existing.is_official = row.is_official as boolean;
		if (existing.company_type == null && row.company_type != null)
			existing.company_type = row.company_type;
	});

	return Array.from(grouped.values()).map((row) => {
		if (service !== "traffic")
			return row;

		const trafficLocations = Array.isArray((row as Record<string, unknown>).traffic_locations)
			? (row as Record<string, unknown>).traffic_locations as PerformanceListItem[]
			: [];
		const locationLabel = Array.from(
			new Set(
				trafficLocations
					.map(item => String(item.location ?? "").trim().toUpperCase())
					.filter(Boolean),
			),
		).join(" / ");

		return {
			...row,
			location: locationLabel || null,
		};
	});
}
