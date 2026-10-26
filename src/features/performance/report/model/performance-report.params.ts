import type {
	PerformanceReportAvailabilityQuery,
	PerformanceReportPeriodType,
	PerformanceReportQuery,
} from "#src/features/performance/api/performances.api";
import type {
	CompanyTypeSelection,
	ReportAggregationKey,
	ReportServiceLayout,
	SmsContractTypeFilter,
	SmsReportType,
} from "../ui/constants";
import type { ReportFinancialColumnKey } from "../ui/export";
import { hasCompanyTypeSelection, isOnlyCompanyType, normalizeCompanyTypeFilter } from "../ui/company-type";

export interface ParsedPeriod {
	period: string
	year: number
	month: number
}

export function parsePeriod(period: string): ParsedPeriod | null {
	const text = String(period ?? "").trim();
	if (!text)
		return null;

	const [yearRaw, monthRaw] = text.split("-");
	const year = Number(yearRaw);
	const month = Number(monthRaw);
	if (!Number.isFinite(year) || !Number.isFinite(month))
		return null;
	if (month < 1 || month > 12)
		return null;

	return {
		period: `${year}-${month}`,
		year,
		month,
	};
}

export function sortPeriods(periods: string[]) {
	return [...periods].sort((a, b) => {
		const parsedA = parsePeriod(a);
		const parsedB = parsePeriod(b);
		if (!parsedA || !parsedB)
			return String(a).localeCompare(String(b));
		if (parsedA.year !== parsedB.year)
			return parsedA.year - parsedB.year;
		return parsedA.month - parsedB.month;
	});
}

export function normalizePeriods(values: unknown) {
	if (!Array.isArray(values))
		return [];

	const dedup = new Set<string>();
	values.forEach((item) => {
		const parsed = parsePeriod(String(item ?? ""));
		if (!parsed)
			return;
		dedup.add(parsed.period);
	});

	return sortPeriods(Array.from(dedup));
}

export function normalizeNumberList(values: unknown) {
	if (!Array.isArray(values))
		return [];

	const dedup = new Set<number>();
	values.forEach((item) => {
		const numeric = Number(item);
		if (Number.isInteger(numeric) && numeric > 0)
			dedup.add(numeric);
	});

	return Array.from(dedup);
}

/** Drops selected periods that the availability endpoint no longer lists; keeps the same array when nothing changes. */
export function prunePeriodsToAvailability(selectedPeriods: string[], availablePeriods: string[]) {
	const availableKeys = new Set(normalizePeriods(availablePeriods));
	const pruned = selectedPeriods.filter((period) => {
		const parsed = parsePeriod(period);
		return parsed != null && availableKeys.has(parsed.period);
	});
	return pruned.length === selectedPeriods.length ? selectedPeriods : pruned;
}

export function isValidDefaultConversionRatio(value: number | null) {
	return value != null && Number.isFinite(value) && value >= 0 && value <= 10;
}

export function buildReportAggregationParams(selectedAggregation: ReportAggregationKey[], isCollocation = false) {
	const params: Pick<PerformanceReportQuery, "by_company" | "by_month" | "by_operator" | "by_language" | "by_data_center"> = {};
	if (selectedAggregation.includes("by_company"))
		params.by_company = true;
	if (selectedAggregation.includes("by_month"))
		params.by_month = true;
	if (selectedAggregation.includes("by_operator"))
		params.by_operator = true;
	if (selectedAggregation.includes("by_language"))
		params.by_language = true;
	// BE: COLLOCATION only; false keeps each data center as its own row, true merges them.
	if (isCollocation && Object.keys(params).length > 0)
		params.by_data_center = selectedAggregation.includes("by_data_center");
	return params;
}

export interface ReportAvailabilityInput {
	serviceId: number | null
	periodType: PerformanceReportPeriodType
	/** Selected periods; empty asks for the list of available periods instead of the available companies. */
	periods: string[]
	companyType: CompanyTypeSelection
	supportsContractType: boolean
	contractType: SmsContractTypeFilter
	aggregation: ReportAggregationKey[]
	isCollocation: boolean
	overallSmsPerformance?: boolean
}

export function contractTypeToIsOfficial(contractType: SmsContractTypeFilter) {
	if (contractType === "official")
		return true;
	return contractType === "unofficial" ? false : undefined;
}

export function buildReportAvailabilityQuery(input: ReportAvailabilityInput): PerformanceReportAvailabilityQuery | null {
	if (!input.serviceId)
		return null;

	const periods = normalizePeriods(input.periods);
	const isFiscal = input.periodType === "fiscal";
	const query: PerformanceReportAvailabilityQuery = {
		service_id: input.serviceId,
		company_type: normalizeCompanyTypeFilter(input.companyType),
		is_official: input.supportsContractType ? contractTypeToIsOfficial(input.contractType) : undefined,
		overall_sms_performance: input.overallSmsPerformance || undefined,
	};

	if (periods.length === 0) {
		return {
			...query,
			period_type: input.periodType,
			...buildReportAggregationParams(input.aggregation, input.isCollocation),
		};
	}

	return {
		...query,
		[isFiscal ? "fiscal_periods" : "sh_periods"]: periods.join(","),
	};
}

export interface ReportParamsInput {
	serviceId: number | null
	serviceCode: string | null
	periodType: PerformanceReportPeriodType
	periods: string[]
	companyType: CompanyTypeSelection
	requiresCompanyType: boolean
	supportsContractType: boolean
	contractType: SmsContractTypeFilter
	selectedCompanyIds: number[]
	availableCompanyIds: number[]
	/** The user explicitly emptied the company list: old behaviour is "no request" rather than "all companies". */
	requireCompanies: boolean
	aggregation: ReportAggregationKey[]
	isUnitConversion: boolean
	showBaseUnit: boolean
	conversionRatio: number | null
	overallSmsPerformance?: boolean
	page: number
	pageSize: number
	total: boolean
}

export function buildPerformanceReportParams(input: ReportParamsInput): PerformanceReportQuery | null {
	if (!input.serviceId || !input.serviceCode)
		return null;

	const periods = normalizePeriods(input.periods);
	if (periods.length === 0)
		return null;

	const companyType = input.requiresCompanyType ? normalizeCompanyTypeFilter(input.companyType) : undefined;
	if (input.requiresCompanyType && !hasCompanyTypeSelection(input.companyType))
		return null;

	const availableSet = new Set(input.availableCompanyIds);
	const companyIds = normalizeNumberList(input.selectedCompanyIds)
		.filter(id => availableSet.size === 0 || availableSet.has(id));
	if (input.requireCompanies && companyIds.length === 0)
		return null;

	const sendsRawValues = input.isUnitConversion && input.showBaseUnit;
	const sendsRatio = input.isUnitConversion && !input.showBaseUnit && isValidDefaultConversionRatio(input.conversionRatio);

	return {
		service_id: input.serviceId,
		service_code: input.serviceCode,
		[input.periodType === "fiscal" ? "fiscal_periods" : "sh_periods"]: periods.join(","),
		company_ids: companyIds.length > 0 && companyIds.length !== availableSet.size ? companyIds.join(",") : undefined,
		company_type: companyType,
		is_official: input.supportsContractType ? contractTypeToIsOfficial(input.contractType) : undefined,
		raw_values: sendsRawValues || undefined,
		default_conversion_ratio: sendsRatio ? Number(input.conversionRatio) : undefined,
		overall_sms_performance: input.overallSmsPerformance || undefined,
		...buildReportAggregationParams(input.aggregation, isOnlyCompanyType(input.companyType, "COLLOCATION")),
		page: input.page,
		page_size: input.pageSize,
		total: input.total,
	};
}

const DEFAULT_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense", "total"];
const OPENAPI_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense"];
const PSP_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense"];
const SHAHKAR_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense", "total"];
const TRAFFIC_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense", "contractType", "total"];
const SALES_AGENCY_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense", "companyType", "total"];
const SMS_NORMAL_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense", "contractType"];
const SMS_FINANCE_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "total"];
const SMS_OPERATOR_GOVERNMENT_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "unitPrice", "expense", "total"];
const SMS_SUMMARY_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = ["rial", "income", "expense", "contractType", "total"];
const SMS_COMMISSION_FINANCIAL_COLUMNS: ReportFinancialColumnKey[] = [
	"rial",
	"unitPrice",
	"karashabIncome",
	"karashabExpense",
	"karashabProfit",
	"telecomIncome",
	"firstPartyIncome",
	"regionIncome",
	"salesAgentIncome",
	"total",
];

function getSmsFinancialDefaults(reportType: SmsReportType) {
	if (reportType === "finance")
		return SMS_FINANCE_FINANCIAL_COLUMNS;
	if (reportType === "summary")
		return SMS_SUMMARY_FINANCIAL_COLUMNS;
	if (reportType === "operatorGovernment")
		return SMS_OPERATOR_GOVERNMENT_FINANCIAL_COLUMNS;
	return SMS_NORMAL_FINANCIAL_COLUMNS;
}

function getLayoutFinancialDefaults(
	layout: ReportServiceLayout,
	smsReportType: SmsReportType,
	isUnitConversion: boolean,
): ReportFinancialColumnKey[] {
	if (layout === "sms-commission")
		return SMS_COMMISSION_FINANCIAL_COLUMNS;
	if (layout === "sms")
		return getSmsFinancialDefaults(smsReportType);
	if (layout === "openapi")
		return OPENAPI_FINANCIAL_COLUMNS;
	if (layout === "psp")
		return PSP_FINANCIAL_COLUMNS;
	if (layout === "shahkar")
		return SHAHKAR_FINANCIAL_COLUMNS;
	if (layout === "sales-agency")
		return SALES_AGENCY_FINANCIAL_COLUMNS;
	if (layout === "traffic")
		return isUnitConversion ? ["showBaseUnit", ...TRAFFIC_FINANCIAL_COLUMNS] : TRAFFIC_FINANCIAL_COLUMNS;
	return DEFAULT_FINANCIAL_COLUMNS;
}

/** Profit, the company-type column and the total line start off (old defaults); the base-unit switch starts on for unit-converted traffic. */
export function getDefaultFinancialColumns(
	layout: ReportServiceLayout,
	smsReportType: SmsReportType,
	isUnitConversion: boolean,
): ReportFinancialColumnKey[] {
	return getLayoutFinancialDefaults(layout, smsReportType, isUnitConversion).filter(key => key !== "total");
}

/** Performances recorded before 1404/4 are legacy imports that the edit workspace refuses to update. */
export function isEditableReportPeriod(year: unknown, month: unknown) {
	const shYear = Number(year);
	const shMonth = Number(month);
	if (!Number.isFinite(shYear) || !Number.isFinite(shMonth))
		return false;
	return shYear > 1404 || (shYear === 1404 && shMonth >= 4);
}

/** Switchable financial columns, in display order, for each report layout. */
export function getFinancialColumnKeys(
	layout: ReportServiceLayout,
	smsReportType: SmsReportType,
	isUnitConversion: boolean,
): ReportFinancialColumnKey[] {
	if (layout === "sms-commission")
		return SMS_COMMISSION_FINANCIAL_COLUMNS;
	if (layout === "openapi" || layout === "shahkar" || layout === "default")
		return ["rial", "income", "expense", "profit", "total"];
	if (layout === "psp")
		return ["rial", "income", "expense", "profit", "companyType", "total"];
	if (layout === "sales-agency")
		return SALES_AGENCY_FINANCIAL_COLUMNS;
	if (layout === "traffic") {
		const keys: ReportFinancialColumnKey[] = ["rial", "income", "expense", "profit", "companyType", "contractType", "total"];
		return isUnitConversion ? ["showBaseUnit", ...keys] : keys;
	}
	if (smsReportType === "finance")
		return SMS_FINANCE_FINANCIAL_COLUMNS;
	if (smsReportType === "operatorGovernment")
		return SMS_OPERATOR_GOVERNMENT_FINANCIAL_COLUMNS;
	return ["rial", "income", "expense", "profit", "companyType", "contractType", "total"];
}
