import type {
	FinanceDepartmentItem,
	FinanceDepartmentTotals,
	OperatorGovernmentMode,
	OperatorGovernmentReportQuery,
	PerformanceReportPeriodType,
	PerformanceReportTotals,
} from "#src/features/performance/api/performances.api";
import type { ReportAggregationKey, SmsContractTypeFilter } from "../ui/constants";
import type { PerformanceReportRow } from "./performance.report.types";
import { buildReportAggregationParams, contractTypeToIsOfficial, normalizePeriods } from "./performance-report.params";

export type SmsCommissionScope = "both" | "commission_only" | "sms_only";
export type FinanceRowType = "operator" | "government" | "profit";

export interface OperatorGovernmentFilters {
	mode: OperatorGovernmentMode
	smsCommission: SmsCommissionScope
	/** Empty list = every operator / language. */
	operators: string[]
	languages: string[]
}

export const DEFAULT_OPERATOR_GOVERNMENT_FILTERS: OperatorGovernmentFilters = {
	mode: "operators",
	smsCommission: "both",
	operators: [],
	languages: [],
};

export interface OperatorGovernmentParamsInput {
	serviceId: number | null
	periodType: PerformanceReportPeriodType
	periods: string[]
	contractType: SmsContractTypeFilter
	/** Only holders of view on the sms_commission service may pick the scope. */
	canFilterSmsCommission: boolean
	filters: OperatorGovernmentFilters
	aggregation: ReportAggregationKey[]
	page: number
	pageSize: number
	total: boolean
}

/** Unofficial contracts never exist for the commission service, so "commission only" would always be empty. */
export function resolveSmsCommissionScope(scope: SmsCommissionScope, contractType: SmsContractTypeFilter): SmsCommissionScope {
	return contractType === "unofficial" && scope === "commission_only" ? "sms_only" : scope;
}

export function buildOperatorGovernmentParams(input: OperatorGovernmentParamsInput): OperatorGovernmentReportQuery | null {
	const periods = normalizePeriods(input.periods);
	if (!input.serviceId || periods.length === 0)
		return null;

	const scope = input.canFilterSmsCommission
		? resolveSmsCommissionScope(input.filters.smsCommission, input.contractType)
		: "both";
	const { by_month, by_operator, by_language } = buildReportAggregationParams(input.aggregation);

	return {
		service_id: input.serviceId,
		mode: input.filters.mode,
		[input.periodType === "fiscal" ? "fiscal_periods" : "sh_periods"]: periods.join(","),
		operators: input.filters.operators.join(",") || undefined,
		languages: input.filters.languages.join(",") || undefined,
		is_official: contractTypeToIsOfficial(input.contractType),
		sms_commission: scope === "both" ? undefined : scope === "commission_only",
		by_month,
		by_operator,
		by_language,
		page: input.page,
		page_size: input.pageSize,
		total: input.total,
	};
}

function toUpperCode(value: string | null | undefined) {
	const code = String(value ?? "").trim().toUpperCase();
	return code || null;
}

/** One backend group (company/month) becomes its operator-language channel rows plus the government and Karashab shares. */
export function flattenFinanceDepartmentRows(items: FinanceDepartmentItem[]): PerformanceReportRow[] {
	const rows: PerformanceReportRow[] = [];
	const pushRow = (
		item: FinanceDepartmentItem,
		rowType: FinanceRowType,
		values: Pick<PerformanceReportRow, "value" | "price" | "income_financial" | "operator" | "language">,
	) => {
		rows.push({
			id: rows.length + 1,
			service_id: item.service_id,
			service_code: item.service_code,
			company_id: item.company_id ?? 0,
			company_name: item.company_name ?? "",
			company_type: item.company_type,
			sh_year: item.sh_year ?? 0,
			sh_month: item.sh_month ?? 0,
			fiscal_year: item.fiscal_year,
			fiscal_month: item.fiscal_month,
			is_official: item.is_official,
			operation_type: "",
			expense_financial: 0,
			profit_financial: 0,
			row_type: rowType,
			...values,
		});
	};

	items.forEach((item) => {
		(item.channels ?? []).forEach((channel) => {
			pushRow(item, "operator", {
				operator: toUpperCode(channel.operator),
				language: toUpperCode(channel.language),
				value: Number(channel.value ?? 0),
				price: toNullableNumber(channel.price),
				income_financial: Number(channel.income_operator ?? 0),
			});
		});
		pushRow(item, "government", {
			value: Number(item.total_value ?? 0),
			price: toNullableNumber(item.price_government),
			income_financial: Number(item.total_income_government ?? 0),
		});
		pushRow(item, "profit", {
			value: Number(item.total_value ?? 0),
			price: toNullableNumber(item.price_profit),
			income_financial: Number(item.total_profit ?? 0),
		});
	});

	return rows;
}

function toNullableNumber(value: unknown) {
	if (value == null || value === "")
		return null;
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeFinanceDepartmentTotals(totals: FinanceDepartmentTotals | null | undefined): PerformanceReportTotals | null {
	if (!totals || typeof totals !== "object")
		return null;

	return {
		value: Number(totals.total_value ?? 0),
		income_financial: Number(totals.total_income ?? totals.total_income_operator ?? 0),
		expense_financial: 0,
		profit_financial: 0,
		total_value: toNullableNumber(totals.total_value),
		total_income_operator: toNullableNumber(totals.total_income_operator),
		total_income_government: toNullableNumber(totals.total_income_government),
		total_profit: toNullableNumber(totals.total_profit),
		total_income: toNullableNumber(totals.total_income),
	};
}

export interface FinanceRowTypeLabels {
	government: string
	profit: string
	overall: string
}

export function formatFinanceRowType(
	row: PerformanceReportRow,
	labels: FinanceRowTypeLabels,
	getOperatorLabel: (operator: string) => string,
	getLanguageLabel: (language: string) => string,
) {
	if (row.row_type === "government")
		return labels.government;
	if (row.row_type === "profit")
		return labels.profit;

	const operator = row.operator ? getOperatorLabel(row.operator) : "";
	const language = row.language ? getLanguageLabel(row.language) : "";
	return operator && language ? `${operator} - ${language}` : operator || language || labels.overall;
}

function isByUnitTotals(totals: unknown): totals is Record<string, PerformanceReportRow> {
	if (!totals || typeof totals !== "object" || Array.isArray(totals))
		return false;
	const values = Object.values(totals);
	return values.length > 0 && values.every(value => value != null && typeof value === "object" && !Array.isArray(value));
}

/** The backend totals come as one object, a list (operator-government) or an object per contract unit (`{"GB/month": {...}}`). */
export function getReportTotalsRows(totals: unknown): PerformanceReportRow[] {
	if (!totals || typeof totals !== "object")
		return [];
	if (Array.isArray(totals))
		return totals as PerformanceReportRow[];
	if (isByUnitTotals(totals))
		return Object.entries(totals).map(([unit, data]) => ({ ...data, contract_unit: unit }));
	return [totals as PerformanceReportRow];
}

export function getReportTotalsRowLabel(label: string, row: PerformanceReportRow) {
	const unit = String(row.contract_unit ?? "").trim();
	return unit ? `${label} (${unit})` : label;
}

/** Fiscal operator-government rows (and totals) show the fiscal period in the shared `sh_year`/`sh_month` fields. */
export function normalizeOperatorGovernmentRow(row: PerformanceReportRow, periodType: PerformanceReportPeriodType): PerformanceReportRow {
	if (periodType !== "fiscal")
		return row;
	return {
		...row,
		sh_year: row.fiscal_year ?? row.sh_year,
		sh_month: row.fiscal_month != null ? Number(row.fiscal_month) : row.sh_month,
		...(row.sh_year != null ? { sh_year_shamsi: row.sh_year } : {}),
	};
}

/** The operator-government endpoint returns rows without ids, which the table needs as keys. */
export function withSequentialIds(rows: PerformanceReportRow[]): PerformanceReportRow[] {
	return rows.map((row, index) => ({ ...row, id: index + 1 }));
}
