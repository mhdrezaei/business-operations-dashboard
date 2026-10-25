import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import type { PerformanceReportRow } from "../model/performance.report.types";
import type { OperatorGovernmentFilters, SmsCommissionScope } from "../model/sms-report-variants";
import type { ReportFinancialColumnKey } from "./export";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { InputNumber, Radio, Select, Typography } from "antd";
import { formatFinanceRowType } from "../model/sms-report-variants";
import { getReportCompanyTypeLabel, hasMixedCompanyTypeIncluding, isOnlyCompanyType, isUnitConversionCompanyType } from "./company-type";
import { formatReportMoney, formatReportNumber } from "./report-number-format";

export interface ReportSelectOption {
	label: string
	value: string | number
}

export interface ReportServiceOption extends ReportSelectOption {
	value: number
	code: string
}

export type SmsReportType = "normal" | "finance" | "summary" | "operatorGovernment";
export type SmsContractTypeFilter = "all" | "official" | "unofficial";
export type CompanyType = string;
export type CompanyTypeSelection = CompanyType | CompanyType[] | null;
export type PeriodType = "sh" | "fiscal";

export const REPORT_FIELD_KEYS = {
	income: ["income_financial", "income"],
	expense: ["expense_financial", "expense"],
	profit: ["profit_financial", "profit"],
	unitPrice: ["price", "unit_price", "sale_rate"],
	karashabIncome: ["income_financial", "income", "karashab_income", "income_karashab", "karashabIncome"],
	karashabExpense: ["expense_financial", "expense", "karashab_expense", "expense_karashab", "karashabExpense"],
	karashabProfit: ["profit_financial", "profit", "karashab_profit", "profit_karashab", "karashabProfit"],
	telecomIncome: ["income_tci", "mokhaberat_income", "telecom_income", "income_mokhaberat", "income_telecom"],
	firstPartyIncome: ["income_first_side", "first_party_income", "income_first_party", "firstPartyIncome"],
	regionIncome: ["income_area", "area_income", "region_income", "income_region"],
	salesAgentIncome: ["income_sales_agent", "sales_agent_income", "salesAgentIncome"],
	sentTraffic: ["value"],
	receivedTraffic: ["value_receive"],
	sentTrafficGbMonth: ["value_gb_month"],
	receivedTrafficGbMonth: ["value_receive_gb_month"],
	sentTrafficMbps: ["value_mbps"],
	receivedTrafficMbps: ["value_receive_mbps"],
	contractUnit: ["contract_unit"],
	location: ["location"],
	fiscalYear: ["fiscal_year"],
	fiscalMonth: ["fiscal_month"],
	createdByUser: ["created_by_user"],
	updatedByUser: ["updated_by_user"],
	conversionRatio: ["conversion_ratio"],
	datacenter: ["datacenter"],
	collocationMode: ["collocation_mode"],
	rackFullCount: ["rack_full_count"],
	rackHalfCount: ["rack_half_count"],
	rackQuarterCount: ["rack_quarter_count"],
	rackUnitCount: ["rack_unit_count"],
	ipCount: ["ip_count"],
	portCount: ["port_count"],
	bandwidthUsed: ["bandwidth_used"],
	ampereUsed: ["ampere_used"],
	rackFullIncome: ["rack_full_income_financial"],
	rackHalfIncome: ["rack_half_income_financial"],
	rackQuarterIncome: ["rack_quarter_income_financial"],
	rackUnitIncome: ["rack_unit_income_financial"],
	rackIncome: ["rack_income_financial"],
	ipIncome: ["ip_income_financial"],
	portIncome: ["port_income_financial"],
	bandwidthIncome: ["bandwidth_income_financial"],
	ampereIncome: ["ampere_income_financial"],
	newCustomerCount: ["new_customer_count"],
	newCustomerIncome: ["new_customer_income"],
	performanceIncome: ["performance_income"],
	creditTotal: ["credit_total"],
	totalSales: ["total_sales"],
} as const;

function pickReportValue(row: PerformanceReportRow, keys: string[]) {
	const record = row as Record<string, unknown>;
	for (const key of keys) {
		const value = record[key];
		if (value !== undefined && value !== null && value !== "")
			return value;
	}
	return null;
}

export function getReportDisplayMonth(month: number, periodType: PeriodType) {
	if (periodType !== "fiscal")
		return month;
	return ((month - 4 + 12) % 12) + 1;
}

export function getReportYearValue(row: PerformanceReportRow, periodType: PeriodType): string | number {
	if (periodType === "fiscal") {
		const value = pickReportValue(row, [...REPORT_FIELD_KEYS.fiscalYear]);
		if (value == null || value === "")
			return "-";
		return value as string | number;
	}
	return row.sh_year ?? "-";
}

export function getReportMonthLabel(row: PerformanceReportRow, periodType: PeriodType): string | number {
	const rawMonth = periodType === "fiscal"
		? pickReportValue(row, [...REPORT_FIELD_KEYS.fiscalMonth])
		: row.sh_month;
	const month = Number(rawMonth);
	if (!Number.isFinite(month)) {
		if (rawMonth == null || rawMonth === "")
			return "-";
		return String(rawMonth);
	}

	const displayMonth = getReportDisplayMonth(month, periodType);
	const found = MONTH_OPTIONS.find(option => option.value === displayMonth);
	return found?.label ?? String(rawMonth);
}

export type ReportAggregationKey = "by_company" | "by_month" | "by_operator" | "by_language" | "by_data_center";

export type ReportAuditColumnKey = "createdByUser" | "updatedByUser";

export const ALL_AUDIT_COLUMN_KEYS: ReportAuditColumnKey[] = ["createdByUser", "updatedByUser"];

const BASE_AGGREGATION_KEYS: ReportAggregationKey[] = ["by_company", "by_month"];
const OPERATOR_LANGUAGE_AGGREGATION_KEYS: ReportAggregationKey[] = ["by_operator", "by_language"];

export function supportsOperatorLanguageAggregation(serviceCode: string | null | undefined) {
	const normalized = String(serviceCode ?? "").trim().toLowerCase();
	return normalized === "openapi" || normalized === "sms" || normalized === "sms-commission" || normalized === "sms_commission";
}

export function getAllowedAggregationKeys(serviceCode: string | null | undefined, isCollocation = false): ReportAggregationKey[] {
	return [
		...BASE_AGGREGATION_KEYS,
		...(supportsOperatorLanguageAggregation(serviceCode) ? OPERATOR_LANGUAGE_AGGREGATION_KEYS : []),
		...(isCollocation ? ["by_data_center" as const] : []),
	];
}

export function filterAggregationKeys(values: ReportAggregationKey[], allowedKeys: ReportAggregationKey[]) {
	const allowed = new Set(allowedKeys);
	return allowedKeys.filter(key => values.includes(key) && allowed.has(key));
}

/** "cp" covers every unit-converted type (CP/IXP/TCI/PREMIUM); COLLOCATION has its own rack/IP/port columns. */
export type TrafficReportLayout = "cp" | "collocation" | "mixed-collocation";

export function getTrafficReportLayout(companyType: CompanyTypeSelection | undefined): TrafficReportLayout {
	if (hasMixedCompanyTypeIncluding(companyType, "COLLOCATION"))
		return "mixed-collocation";
	return isOnlyCompanyType(companyType, "COLLOCATION") ? "collocation" : "cp";
}

export type ReportServiceLayout = "openapi" | "sms" | "sms-commission" | "psp" | "shahkar" | "traffic" | "sales-agency" | "default";

export function getReportServiceLayout(serviceCode: string | null | undefined): ReportServiceLayout {
	const normalized = String(serviceCode ?? "").trim().toLowerCase();
	if (normalized === "openapi")
		return "openapi";
	if (normalized === "sms")
		return "sms";
	if (normalized === "sms-commission" || normalized === "sms_commission")
		return "sms-commission";
	if (normalized === "psp")
		return "psp";
	if (normalized === "shahkar")
		return "shahkar";
	if (normalized === "traffic")
		return "traffic";
	if (normalized === "sales_agency" || normalized === "sales-agency")
		return "sales-agency";
	return "default";
}

export interface GetPerformanceReportColumnsArgs {
	t: TFunction<"translation", undefined>
	selectedServiceCode: string | null
	selectedServiceName: string | null
	serviceOptions: ReportServiceOption[]
	companyTypeOptions: ReportSelectOption[]
	contractTypeOptions: ReportSelectOption[]
	smsReportTypeOptions: ReportSelectOption[]
	selectedFinancialColumns: ReportFinancialColumnKey[]
	selectedAuditColumns: ReportAuditColumnKey[]
	defaultConversionRatio: number | null
	isDefaultConversionRatioInvalid: boolean
	isAuditColumnsDisabled: boolean
	selectedAggregation: ReportAggregationKey[]
	selectedSmsReportType: SmsReportType
	selectedPeriodType: PeriodType
	selectedCompanyType: CompanyTypeSelection
	isSmsService: boolean
	isTrafficService: boolean
	supportsOperatorLanguageAggregation: boolean
	requiresCompanyType: boolean
	onServiceChange: (serviceId: number | null, serviceCode: string | null) => void
	onCompanyTypeChange: (value: CompanyTypeSelection) => void
	onContractTypeChange: (value: SmsContractTypeFilter) => void
	onSmsReportTypeChange: (value: SmsReportType) => void
	operatorGovernmentFilters: OperatorGovernmentFilters
	canFilterSmsCommission: boolean
	onOperatorGovernmentFiltersChange: (filters: Partial<OperatorGovernmentFilters>) => void
	onDefaultConversionRatioChange: (value: number | null) => void
	renderRowActions: (row: PerformanceReportRow) => ReactNode
}

function createOperationTypeLabels(t: TFunction<"translation", undefined>) {
	return {
		BILL_INQUIRY: t("performance.operationType.billInquiry"),
		RECEIPT_REGISTER: t("performance.operationType.receiptRegister"),
	} as Record<string, string>;
}

function createValueEnum(options: ReportSelectOption[]) {
	return options.reduce((acc, option) => {
		acc[String(option.value)] = option.label;
		return acc;
	}, {} as Record<string, string>);
}

function toNullableNumber(value: unknown) {
	if (value == null || value === "")
		return null;
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

function createOperatorLabels(t: TFunction<"translation", undefined>) {
	return {
		IRANCELL: t("performance.operator.irancell"),
		MCI: t("performance.operator.mci"),
		OTHER: t("performance.operator.other"),
	} as Record<string, string>;
}

function getLanguageLabel(t: TFunction<"translation", undefined>, value: unknown) {
	const normalized = String(value ?? "").trim().toUpperCase();
	if (!normalized)
		return "-";
	if (normalized === "FA")
		return t("performance.language.fa");
	if (normalized === "EN")
		return t("performance.language.en");
	return String(value);
}

function getContractTypeLabel(t: TFunction<"translation", undefined>, value: unknown) {
	if (value === true)
		return t("performance.contractType.official");
	if (value === false)
		return t("performance.contractType.unofficial");
	return "-";
}

function getSalesAgentLabel(row: PerformanceReportRow) {
	const name = pickReportValue(row, ["sales_agent_name", "salesAgentName"]);
	if (name)
		return String(name);
	const agent = pickReportValue(row, ["sales_agent", "sales_agent_id", "agent"]);
	return agent == null ? "-" : String(agent);
}

interface ReportTableColumnContext {
	t: TFunction<"translation", undefined>
	operationTypeLabels: Record<string, string>
	operatorLabels: Record<string, string>
	companyTypeOptions: ReportSelectOption[]
	serviceNameFallback: string | null
	periodType: PeriodType
	trafficLayout: TrafficReportLayout
	aggregateByCompany: boolean
	aggregateByMonth: boolean
	aggregateByOperator: boolean
	aggregateByLanguage: boolean
	showRial: boolean
	showCompanyType: boolean
	isSalesAgencyOutbound: boolean
	smsReportType: SmsReportType
}

function createTrafficLocationLabels(t: TFunction<"translation", undefined>) {
	return {
		TEHRAN: t("performance.traffic.locations.tehran"),
		COUNTY: t("performance.traffic.locations.county"),
	} as Record<string, string>;
}

function getTrafficLocationLabel(locationLabels: Record<string, string>, location: unknown) {
	const key = String(location ?? "").trim().toUpperCase();
	if (!key)
		return "-";
	return locationLabels[key] ?? String(location);
}

export function formatReportUserRef(value: unknown): string {
	if (value == null || value === "")
		return "-";
	if (typeof value === "string")
		return value.trim() || "-";
	if (typeof value === "object") {
		const user = value as Record<string, unknown>;
		const fullName = [user.first_name, user.last_name]
			.map(item => String(item ?? "").trim())
			.filter(Boolean)
			.join(" ")
			.trim();
		if (fullName)
			return fullName;
		const username = String(user.username ?? "").trim();
		if (username)
			return username;
		if (user.id != null && user.id !== "")
			return `#${user.id}`;
		return "-";
	}
	const text = String(value).trim();
	return text || "-";
}

function createReportCreatedByUserColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.createdByUser"),
		dataIndex: "created_by_user",
		search: false,
		width: 180,
		render: (_, row) => formatReportUserRef(row.created_by_user),
	};
}

function createReportUpdatedByUserColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.updatedByUser"),
		dataIndex: "updated_by_user",
		search: false,
		width: 190,
		render: (_, row) => formatReportUserRef(row.updated_by_user),
	};
}

function appendReportAuditColumns(
	tableColumns: ProColumns<PerformanceReportRow>[],
	auditColumns: Set<ReportAuditColumnKey>,
	t: TFunction<"translation", undefined>,
) {
	if (auditColumns.has("createdByUser"))
		tableColumns.push(createReportCreatedByUserColumn(t));
	if (auditColumns.has("updatedByUser"))
		tableColumns.push(createReportUpdatedByUserColumn(t));
	return tableColumns;
}

function createReportIndexColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		dataIndex: "index",
		title: t("common.index"),
		valueType: "indexBorder",
		width: 80,
		hideInSearch: true,
	};
}

function createReportIdColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.id"),
		dataIndex: "id",
		search: false,
		width: 110,
	};
}

function createReportCompanyNameColumn(
	t: TFunction<"translation", undefined>,
): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.companyName"),
		dataIndex: "company_name",
		search: false,
		width: 260,
		render: (_, row) => row.company_name ?? "-",
	};
}

function createReportServiceNameColumn(
	t: TFunction<"translation", undefined>,
	serviceNameFallback: string | null,
): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.service"),
		dataIndex: "service_name",
		search: false,
		width: 200,
		render: (_, row) => row.service_name ?? serviceNameFallback ?? "-",
	};
}

function createReportYearColumn(
	t: TFunction<"translation", undefined>,
	title?: string,
	periodType: PeriodType = "sh",
): ProColumns<PerformanceReportRow> {
	return {
		title: title ?? (periodType === "fiscal" ? t("performance.columns.fiscalYear") : t("performance.columns.year")),
		dataIndex: periodType === "fiscal" ? "fiscal_year" : "sh_year",
		search: false,
		width: 100,
		render: (_, row) => getReportYearValue(row, periodType),
	};
}

function createReportShYearColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.shYear"),
		dataIndex: "sh_year",
		search: false,
		width: 100,
		render: (_, row) => row.sh_year ?? "-",
	};
}

function appendFiscalShYearColumn(
	tableColumns: ProColumns<PerformanceReportRow>[],
	ctx: ReportTableColumnContext,
) {
	if (ctx.periodType === "fiscal")
		tableColumns.push(createReportShYearColumn(ctx.t));
}

function appendFiscalYearColumns(
	tableColumns: ProColumns<PerformanceReportRow>[],
	ctx: ReportTableColumnContext,
	title?: string,
) {
	appendFiscalShYearColumn(tableColumns, ctx);
	tableColumns.push(createReportYearColumn(ctx.t, title, ctx.periodType));
}

function createReportMonthColumn(
	t: TFunction<"translation", undefined>,
	periodType: PeriodType = "sh",
	title?: string,
): ProColumns<PerformanceReportRow> {
	return {
		title: title ?? (periodType === "fiscal" ? t("performance.columns.fiscalMonth") : t("performance.columns.month")),
		dataIndex: periodType === "fiscal" ? "fiscal_month" : "sh_month",
		search: false,
		width: 110,
		render: (_, row) => getReportMonthLabel(row, periodType),
	};
}

function createReportCountColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.count"),
		dataIndex: "value",
		search: false,
		width: 140,
		render: (_, row) => formatReportNumber(row.value),
	};
}

function createReportOperationTypeColumn(
	t: TFunction<"translation", undefined>,
	operationTypeLabels: Record<string, string>,
): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.operationType"),
		dataIndex: "operation_type",
		search: false,
		width: 190,
		render: (_, row) => {
			if (!row.operation_type)
				return "-";
			return operationTypeLabels[row.operation_type] ?? row.operation_type;
		},
	};
}

function createReportOperatorColumn(
	t: TFunction<"translation", undefined>,
	operatorLabels: Record<string, string>,
): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.operator"),
		dataIndex: "operator",
		search: false,
		width: 120,
		render: (_, row) => {
			const operator = pickReportValue(row, ["operator"]);
			if (!operator)
				return "-";
			const label = operatorLabels[String(operator).trim().toUpperCase()];
			return label ?? String(operator);
		},
	};
}

function createReportLanguageColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.language"),
		dataIndex: "language",
		search: false,
		width: 100,
		render: (_, row) => getLanguageLabel(t, pickReportValue(row, ["language"])),
	};
}

function createReportIncomeColumn(t: TFunction<"translation", undefined>, showRial: boolean): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.income"),
		dataIndex: "income_financial",
		search: false,
		width: 160,
		render: (_, row) => formatReportMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.income]), showRial),
	};
}

function createReportExpenseColumn(t: TFunction<"translation", undefined>, showRial: boolean): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.expense"),
		dataIndex: "expense_financial",
		search: false,
		width: 160,
		render: (_, row) => formatReportMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.expense]), showRial),
	};
}

function createReportProfitColumn(t: TFunction<"translation", undefined>, showRial: boolean): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.profit"),
		dataIndex: "profit_financial",
		search: false,
		width: 160,
		render: (_, row) => formatReportMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.profit]), showRial),
	};
}

function createReportUnitPriceColumn(t: TFunction<"translation", undefined>, showRial: boolean): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.unitPrice"),
		dataIndex: "unit_price",
		search: false,
		width: 160,
		render: (_, row) => formatReportMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.unitPrice]), showRial),
	};
}

function createReportContractTypeColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.contractType"),
		dataIndex: "is_official",
		search: false,
		width: 160,
		render: (_, row) => getContractTypeLabel(t, row.is_official),
	};
}

function createReportNumericValueColumn(
	t: TFunction<"translation", undefined>,
	title: string,
	dataIndex: string,
	keys: string[],
	width = 180,
	showRial: boolean | null = null,
): ProColumns<PerformanceReportRow> {
	return {
		title,
		dataIndex,
		search: false,
		width,
		render: (_, row) => {
			const value = pickReportValue(row, keys);
			return showRial == null ? formatReportNumber(value) : formatReportMoney(value, showRial);
		},
	};
}

function createReportSalesAgentColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.salesAgent"),
		dataIndex: "sales_agent",
		search: false,
		width: 180,
		render: (_, row) => getSalesAgentLabel(row),
	};
}

function createReportContractUnitColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.contractUnit"),
		dataIndex: "contract_unit",
		search: false,
		width: 160,
		render: (_, row) => {
			const value = pickReportValue(row, [...REPORT_FIELD_KEYS.contractUnit]);
			return value == null ? "-" : String(value);
		},
	};
}

function createReportPositionColumn(
	t: TFunction<"translation", undefined>,
	locationLabels: Record<string, string>,
): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.position"),
		dataIndex: "location",
		search: false,
		width: 140,
		render: (_, row) => getTrafficLocationLabel(locationLabels, pickReportValue(row, [...REPORT_FIELD_KEYS.location])),
	};
}

function createReportSentTrafficColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.fields.traffic.sentTraffic"),
		dataIndex: "value",
		search: false,
		width: 150,
		render: (_, row) => formatReportNumber(pickReportValue(row, [...REPORT_FIELD_KEYS.sentTraffic])),
	};
}

function createReportReceivedTrafficColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.fields.traffic.receivedTraffic"),
		dataIndex: "value_receive",
		search: false,
		width: 150,
		render: (_, row) => formatReportNumber(pickReportValue(row, [...REPORT_FIELD_KEYS.receivedTraffic])),
	};
}

function createReportTrafficValueColumn(
	t: TFunction<"translation", undefined>,
	title: string,
	dataIndex: string,
	keys: string[],
): ProColumns<PerformanceReportRow> {
	return {
		title,
		dataIndex,
		search: false,
		width: 190,
		render: (_, row) => formatReportNumber(pickReportValue(row, keys)),
	};
}

function createReportTrafficConvertedColumns(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow>[] {
	return [
		createReportTrafficValueColumn(
			t,
			t("performance.fields.traffic.sentTrafficWithUnit", { unit: "GB/month", interpolation: { escapeValue: false } }),
			"value_gb_month",
			[...REPORT_FIELD_KEYS.sentTrafficGbMonth],
		),
		createReportTrafficValueColumn(
			t,
			t("performance.fields.traffic.receivedTrafficWithUnit", { unit: "GB/month", interpolation: { escapeValue: false } }),
			"value_receive_gb_month",
			[...REPORT_FIELD_KEYS.receivedTrafficGbMonth],
		),
		createReportTrafficValueColumn(
			t,
			t("performance.fields.traffic.sentTrafficWithUnit", { unit: "Mbps" }),
			"value_mbps",
			[...REPORT_FIELD_KEYS.sentTrafficMbps],
		),
		createReportTrafficValueColumn(
			t,
			t("performance.fields.traffic.receivedTrafficWithUnit", { unit: "Mbps" }),
			"value_receive_mbps",
			[...REPORT_FIELD_KEYS.receivedTrafficMbps],
		),
	];
}

export function formatReportDatacenterName(value: unknown): string {
	if (value == null || value === "")
		return "-";
	if (typeof value === "string")
		return value.trim() || "-";
	if (typeof value === "object") {
		const datacenter = value as Record<string, unknown>;
		const name = datacenter.name ?? datacenter.title;
		if (name != null && String(name).trim())
			return String(name).trim();
		if (datacenter.id != null)
			return `#${datacenter.id}`;
	}
	return "-";
}

function createReportConversionRatioColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return createReportNumericValueColumn(
		t,
		t("performance.columns.conversionRatio"),
		"conversion_ratio",
		[...REPORT_FIELD_KEYS.conversionRatio],
		140,
	);
}

function createReportDatacenterColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.datacenter"),
		dataIndex: "datacenter",
		search: false,
		width: 180,
		render: (_, row) => formatReportDatacenterName(pickReportValue(row, [...REPORT_FIELD_KEYS.datacenter])),
	};
}

function createReportPartnerTypeColumn(t: TFunction<"translation", undefined>): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.partnerType"),
		dataIndex: "collocation_mode",
		search: false,
		width: 140,
		render: (_, row) => {
			const value = pickReportValue(row, [...REPORT_FIELD_KEYS.collocationMode]);
			return value == null ? "-" : String(value);
		},
	};
}

function appendTrafficFinancialColumns(
	tableColumns: ProColumns<PerformanceReportRow>[],
	ctx: ReportTableColumnContext,
	financialColumns: Set<ReportFinancialColumnKey>,
) {
	if (financialColumns.has("income"))
		tableColumns.push(createReportIncomeColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("expense"))
		tableColumns.push(createReportExpenseColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("profit"))
		tableColumns.push(createReportProfitColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("contractType"))
		tableColumns.push(createReportContractTypeColumn(ctx.t));
}

function createReportCompanyTypeColumn(
	t: TFunction<"translation", undefined>,
	companyTypeOptions: ReportSelectOption[],
): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.companyType"),
		dataIndex: "company_type",
		search: false,
		width: 140,
		render: (_, row) => getReportCompanyTypeLabel(row.company_type, companyTypeOptions),
	};
}

function appendSharedDimensionColumns(
	tableColumns: ProColumns<PerformanceReportRow>[],
	ctx: ReportTableColumnContext,
	includeOperatorLanguage: boolean,
	includeCompanyType = false,
) {
	if (!ctx.aggregateByCompany)
		tableColumns.push(createReportCompanyNameColumn(ctx.t));
	if (includeCompanyType)
		tableColumns.push(createReportCompanyTypeColumn(ctx.t, ctx.companyTypeOptions));

	appendFiscalYearColumns(tableColumns, ctx);

	if (!ctx.aggregateByMonth)
		tableColumns.push(createReportMonthColumn(ctx.t, ctx.periodType));

	if (includeOperatorLanguage && !ctx.aggregateByOperator)
		tableColumns.push(createReportOperatorColumn(ctx.t, ctx.operatorLabels));

	if (includeOperatorLanguage && !ctx.aggregateByLanguage)
		tableColumns.push(createReportLanguageColumn(ctx.t));
}

function buildOpenApiReportTableColumns(
	ctx: ReportTableColumnContext,
	financialColumns: Set<ReportFinancialColumnKey>,
): ProColumns<PerformanceReportRow>[] {
	const tableColumns: ProColumns<PerformanceReportRow>[] = [
		createReportIndexColumn(ctx.t),
		createReportIdColumn(ctx.t),
	];

	appendSharedDimensionColumns(tableColumns, ctx, false);

	tableColumns.push(
		createReportCountColumn(ctx.t),
		createReportOperationTypeColumn(ctx.t, ctx.operationTypeLabels),
	);

	if (financialColumns.has("income"))
		tableColumns.push(createReportIncomeColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("expense"))
		tableColumns.push(createReportExpenseColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("profit"))
		tableColumns.push(createReportProfitColumn(ctx.t, ctx.showRial));
	return tableColumns;
}

function createReportRowTypeColumn(
	t: TFunction<"translation", undefined>,
	operatorLabels: Record<string, string>,
): ProColumns<PerformanceReportRow> {
	return {
		title: t("performance.columns.rowType"),
		dataIndex: "row_type",
		search: false,
		width: 200,
		render: (_, row) => formatFinanceRowType(
			row,
			{
				government: t("performance.rowType.government"),
				profit: t("performance.rowType.profit"),
				overall: t("performance.rowType.overall"),
			},
			operator => operatorLabels[operator] ?? operator,
			language => getLanguageLabel(t, language),
		),
	};
}

/** Finance-department rows: one line per operator/language plus the government and Karashab shares. */
function buildSmsFinanceReportTableColumns(
	ctx: ReportTableColumnContext,
	financialColumns: Set<ReportFinancialColumnKey>,
): ProColumns<PerformanceReportRow>[] {
	const tableColumns: ProColumns<PerformanceReportRow>[] = [createReportIndexColumn(ctx.t)];

	appendSharedDimensionColumns(tableColumns, ctx, false, ctx.showCompanyType);
	tableColumns.push(
		createReportRowTypeColumn(ctx.t, ctx.operatorLabels),
		createReportCountColumn(ctx.t),
		createReportUnitPriceColumn(ctx.t, ctx.showRial),
	);
	if (financialColumns.has("income"))
		tableColumns.push(createReportIncomeColumn(ctx.t, ctx.showRial));

	return tableColumns;
}

/** Operator-government rows are system-wide, so there is no company dimension. */
function buildSmsOperatorGovernmentReportTableColumns(
	ctx: ReportTableColumnContext,
	financialColumns: Set<ReportFinancialColumnKey>,
): ProColumns<PerformanceReportRow>[] {
	const tableColumns: ProColumns<PerformanceReportRow>[] = [
		createReportIndexColumn(ctx.t),
		createReportServiceNameColumn(ctx.t, ctx.serviceNameFallback),
	];

	appendFiscalYearColumns(tableColumns, ctx);
	if (!ctx.aggregateByMonth)
		tableColumns.push(createReportMonthColumn(ctx.t, ctx.periodType));
	if (!ctx.aggregateByOperator)
		tableColumns.push(createReportOperatorColumn(ctx.t, ctx.operatorLabels));
	if (!ctx.aggregateByLanguage)
		tableColumns.push(createReportLanguageColumn(ctx.t));

	tableColumns.push(createReportCountColumn(ctx.t));
	if (financialColumns.has("unitPrice"))
		tableColumns.push(createReportUnitPriceColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("expense"))
		tableColumns.push(createReportExpenseColumn(ctx.t, ctx.showRial));

	return tableColumns;
}

function buildSmsReportTableColumns(
	ctx: ReportTableColumnContext,
	financialColumns: Set<ReportFinancialColumnKey>,
): ProColumns<PerformanceReportRow>[] {
	if (ctx.smsReportType === "finance")
		return buildSmsFinanceReportTableColumns(ctx, financialColumns);
	if (ctx.smsReportType === "operatorGovernment")
		return buildSmsOperatorGovernmentReportTableColumns(ctx, financialColumns);

	const tableColumns: ProColumns<PerformanceReportRow>[] = [
		createReportIndexColumn(ctx.t),
		createReportIdColumn(ctx.t),
	];

	// The overall report mixes sms and sms commission rows.
	if (ctx.smsReportType === "summary")
		tableColumns.push(createReportServiceNameColumn(ctx.t, ctx.serviceNameFallback));

	appendSharedDimensionColumns(tableColumns, ctx, true, ctx.showCompanyType);

	tableColumns.push(
		createReportCountColumn(ctx.t),
		createReportUnitPriceColumn(ctx.t, ctx.showRial),
	);

	if (financialColumns.has("income"))
		tableColumns.push(createReportIncomeColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("expense"))
		tableColumns.push(createReportExpenseColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("profit"))
		tableColumns.push(createReportProfitColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("contractType"))
		tableColumns.push(createReportContractTypeColumn(ctx.t));

	return tableColumns;
}

function buildSmsCommissionReportTableColumns(
	ctx: ReportTableColumnContext,
	financialColumns: Set<ReportFinancialColumnKey>,
): ProColumns<PerformanceReportRow>[] {
	const tableColumns: ProColumns<PerformanceReportRow>[] = [
		createReportIndexColumn(ctx.t),
		createReportIdColumn(ctx.t),
	];

	appendSharedDimensionColumns(tableColumns, ctx, true);

	tableColumns.push(createReportCountColumn(ctx.t));

	if (financialColumns.has("unitPrice"))
		tableColumns.push(createReportUnitPriceColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("karashabIncome")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.karashabIncome"),
			"income_financial",
			[...REPORT_FIELD_KEYS.karashabIncome],
			180,
			ctx.showRial,
		));
	}
	if (financialColumns.has("karashabExpense")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.karashabExpense"),
			"expense_financial",
			[...REPORT_FIELD_KEYS.karashabExpense],
			180,
			ctx.showRial,
		));
	}
	if (financialColumns.has("karashabProfit")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.karashabProfit"),
			"profit_financial",
			[...REPORT_FIELD_KEYS.karashabProfit],
			180,
			ctx.showRial,
		));
	}
	if (financialColumns.has("telecomIncome")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.telecomIncome"),
			"income_tci",
			[...REPORT_FIELD_KEYS.telecomIncome],
			180,
			ctx.showRial,
		));
	}
	if (financialColumns.has("firstPartyIncome")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.firstPartyIncome"),
			"income_first_side",
			[...REPORT_FIELD_KEYS.firstPartyIncome],
			180,
			ctx.showRial,
		));
	}
	if (financialColumns.has("regionIncome")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.regionIncome"),
			"income_area",
			[...REPORT_FIELD_KEYS.regionIncome],
			180,
			ctx.showRial,
		));
	}

	tableColumns.push(createReportSalesAgentColumn(ctx.t));

	if (financialColumns.has("salesAgentIncome")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.salesAgentIncome"),
			"income_sales_agent",
			[...REPORT_FIELD_KEYS.salesAgentIncome],
			190,
			ctx.showRial,
		));
	}
	return tableColumns;
}

function buildShahkarReportTableColumns(
	ctx: ReportTableColumnContext,
	financialColumns: Set<ReportFinancialColumnKey>,
): ProColumns<PerformanceReportRow>[] {
	const tableColumns: ProColumns<PerformanceReportRow>[] = [
		createReportIndexColumn(ctx.t),
		createReportIdColumn(ctx.t),
		createReportServiceNameColumn(ctx.t, ctx.serviceNameFallback),
	];

	if (!ctx.aggregateByCompany)
		tableColumns.push(createReportCompanyNameColumn(ctx.t));

	appendFiscalYearColumns(tableColumns, ctx);

	if (!ctx.aggregateByMonth)
		tableColumns.push(createReportMonthColumn(ctx.t, ctx.periodType));

	tableColumns.push(createReportCountColumn(ctx.t));

	if (financialColumns.has("income"))
		tableColumns.push(createReportIncomeColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("expense"))
		tableColumns.push(createReportExpenseColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("profit"))
		tableColumns.push(createReportProfitColumn(ctx.t, ctx.showRial));

	tableColumns.push(
		createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.newCustomerCount"), "new_customer_count", [...REPORT_FIELD_KEYS.newCustomerCount]),
		createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.newCustomerIncome"), "new_customer_income", [...REPORT_FIELD_KEYS.newCustomerIncome], 180, ctx.showRial),
		createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.performanceIncome"), "performance_income", [...REPORT_FIELD_KEYS.performanceIncome], 180, ctx.showRial),
	);

	return tableColumns;
}

function buildTrafficReportTableColumns(
	ctx: ReportTableColumnContext,
	financialColumns: Set<ReportFinancialColumnKey>,
): ProColumns<PerformanceReportRow>[] {
	const locationLabels = createTrafficLocationLabels(ctx.t);
	const yearTitle = ctx.periodType === "fiscal"
		? ctx.t("performance.columns.fiscalYear")
		: ctx.t("performance.columns.year");
	const monthTitle = ctx.periodType === "fiscal"
		? ctx.t("performance.columns.fiscalMonth")
		: ctx.t("performance.columns.month");

	const tableColumns: ProColumns<PerformanceReportRow>[] = [
		createReportIndexColumn(ctx.t),
		createReportIdColumn(ctx.t),
		createReportServiceNameColumn(ctx.t, ctx.serviceNameFallback),
	];

	if (!ctx.aggregateByCompany)
		tableColumns.push(createReportCompanyNameColumn(ctx.t));

	if (ctx.showCompanyType)
		tableColumns.push(createReportCompanyTypeColumn(ctx.t, ctx.companyTypeOptions));
	appendFiscalYearColumns(tableColumns, ctx, yearTitle);

	if (!ctx.aggregateByMonth)
		tableColumns.push(createReportMonthColumn(ctx.t, ctx.periodType, monthTitle));

	if (ctx.trafficLayout === "mixed-collocation") {
		if (financialColumns.has("income"))
			tableColumns.push(createReportIncomeColumn(ctx.t, ctx.showRial));
		if (financialColumns.has("expense"))
			tableColumns.push(createReportExpenseColumn(ctx.t, ctx.showRial));
		if (financialColumns.has("contractType"))
			tableColumns.push(createReportContractTypeColumn(ctx.t));
		return tableColumns;
	}

	if (ctx.trafficLayout === "collocation") {
		tableColumns.push(
			createReportDatacenterColumn(ctx.t),
			createReportPartnerTypeColumn(ctx.t),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.rackFullCount"), "rack_full_count", [...REPORT_FIELD_KEYS.rackFullCount]),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.rackHalfCount"), "rack_half_count", [...REPORT_FIELD_KEYS.rackHalfCount]),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.rackQuarterCount"), "rack_quarter_count", [...REPORT_FIELD_KEYS.rackQuarterCount]),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.rackUnitCount"), "rack_unit_count", [...REPORT_FIELD_KEYS.rackUnitCount]),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.ipCount"), "ip_count", [...REPORT_FIELD_KEYS.ipCount]),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.portCount"), "port_count", [...REPORT_FIELD_KEYS.portCount]),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.bandwidthUsed"), "bandwidth_used", [...REPORT_FIELD_KEYS.bandwidthUsed]),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.ampereUsed"), "ampere_used", [...REPORT_FIELD_KEYS.ampereUsed]),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.rackFullIncome"), "rack_full_income_financial", [...REPORT_FIELD_KEYS.rackFullIncome], 180, ctx.showRial),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.rackHalfIncome"), "rack_half_income_financial", [...REPORT_FIELD_KEYS.rackHalfIncome], 180, ctx.showRial),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.rackQuarterIncome"), "rack_quarter_income_financial", [...REPORT_FIELD_KEYS.rackQuarterIncome], 180, ctx.showRial),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.rackUnitIncome"), "rack_unit_income_financial", [...REPORT_FIELD_KEYS.rackUnitIncome], 180, ctx.showRial),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.rackIncome"), "rack_income_financial", [...REPORT_FIELD_KEYS.rackIncome], 180, ctx.showRial),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.ipIncome"), "ip_income_financial", [...REPORT_FIELD_KEYS.ipIncome], 180, ctx.showRial),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.portIncome"), "port_income_financial", [...REPORT_FIELD_KEYS.portIncome], 180, ctx.showRial),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.bandwidthIncome"), "bandwidth_income_financial", [...REPORT_FIELD_KEYS.bandwidthIncome], 180, ctx.showRial),
			createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.ampereIncome"), "ampere_income_financial", [...REPORT_FIELD_KEYS.ampereIncome], 180, ctx.showRial),
		);
		appendTrafficFinancialColumns(tableColumns, ctx, financialColumns);
		return tableColumns;
	}

	tableColumns.push(
		createReportContractUnitColumn(ctx.t),
	);
	if (!financialColumns.has("showBaseUnit"))
		tableColumns.push(createReportConversionRatioColumn(ctx.t));
	tableColumns.push(createReportPositionColumn(ctx.t, locationLabels));
	if (financialColumns.has("showBaseUnit")) {
		tableColumns.push(
			createReportSentTrafficColumn(ctx.t),
			createReportReceivedTrafficColumn(ctx.t),
		);
	}
	else {
		tableColumns.push(...createReportTrafficConvertedColumns(ctx.t));
	}
	appendTrafficFinancialColumns(tableColumns, ctx, financialColumns);
	return tableColumns;
}

function buildPspReportTableColumns(
	ctx: ReportTableColumnContext,
	financialColumns: Set<ReportFinancialColumnKey>,
): ProColumns<PerformanceReportRow>[] {
	const tableColumns: ProColumns<PerformanceReportRow>[] = [
		createReportIndexColumn(ctx.t),
		createReportIdColumn(ctx.t),
	];
	if (ctx.showCompanyType)
		tableColumns.push(createReportCompanyTypeColumn(ctx.t, ctx.companyTypeOptions));
	appendFiscalYearColumns(tableColumns, ctx);
	tableColumns.push(createReportCountColumn(ctx.t));

	if (financialColumns.has("income"))
		tableColumns.push(createReportIncomeColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("expense"))
		tableColumns.push(createReportExpenseColumn(ctx.t, ctx.showRial));
	if (financialColumns.has("profit"))
		tableColumns.push(createReportProfitColumn(ctx.t, ctx.showRial));
	return tableColumns;
}

interface SalesAgencyCostItem {
	cost_title?: string | null
	amount?: number | string | null
}

function getSalesAgencyCostItems(row: PerformanceReportRow): SalesAgencyCostItem[] {
	return Array.isArray(row.cost_items) ? row.cost_items as SalesAgencyCostItem[] : [];
}

export function formatSalesAgencyCostItems(row: PerformanceReportRow, showRial: boolean) {
	const items = getSalesAgencyCostItems(row);
	if (items.length === 0)
		return "-";
	return items.map(item => `${item.cost_title ?? "-"}: ${formatReportMoney(item.amount, showRial)}`).join("، ");
}

export function getSalesAgencyTotalCost(row: PerformanceReportRow) {
	const items = getSalesAgencyCostItems(row);
	if (items.length === 0)
		return null;
	return items.reduce((sum, item) => sum + (toNullableNumber(item.amount) ?? 0), 0);
}

function buildSalesAgencyReportTableColumns(
	ctx: ReportTableColumnContext,
	financialColumns: Set<ReportFinancialColumnKey>,
): ProColumns<PerformanceReportRow>[] {
	const tableColumns: ProColumns<PerformanceReportRow>[] = [
		createReportIndexColumn(ctx.t),
		createReportIdColumn(ctx.t),
	];

	if (!ctx.aggregateByCompany)
		tableColumns.push(createReportCompanyNameColumn(ctx.t));
	if (ctx.showCompanyType)
		tableColumns.push(createReportCompanyTypeColumn(ctx.t, ctx.companyTypeOptions));
	appendFiscalYearColumns(tableColumns, ctx);
	if (!ctx.aggregateByMonth)
		tableColumns.push(createReportMonthColumn(ctx.t, ctx.periodType));

	tableColumns.push(ctx.isSalesAgencyOutbound
		? createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.totalSales"), "total_sales", [...REPORT_FIELD_KEYS.totalSales], 180, ctx.showRial)
		: createReportNumericValueColumn(ctx.t, ctx.t("performance.columns.creditTotal"), "credit_total", [...REPORT_FIELD_KEYS.creditTotal], 180, ctx.showRial));

	if (financialColumns.has("income"))
		tableColumns.push(createReportIncomeColumn(ctx.t, ctx.showRial));
	if (!financialColumns.has("expense"))
		return tableColumns;

	if (ctx.isSalesAgencyOutbound) {
		tableColumns.push(createReportExpenseColumn(ctx.t, ctx.showRial));
		return tableColumns;
	}

	tableColumns.push(
		{
			title: ctx.t("performance.columns.costItems"),
			dataIndex: "cost_items",
			search: false,
			width: 260,
			render: (_, row) => formatSalesAgencyCostItems(row, ctx.showRial),
		},
		{
			title: ctx.t("performance.columns.totalCost"),
			dataIndex: "total_cost",
			search: false,
			width: 180,
			render: (_, row) => formatReportMoney(getSalesAgencyTotalCost(row), ctx.showRial),
		},
	);
	return tableColumns;
}

function buildDefaultReportTableColumns(
	ctx: ReportTableColumnContext,
	financialColumns: Set<ReportFinancialColumnKey>,
	showOperatorLanguage: boolean,
): ProColumns<PerformanceReportRow>[] {
	const tableColumns: ProColumns<PerformanceReportRow>[] = [
		createReportIndexColumn(ctx.t),
		createReportIdColumn(ctx.t),
	];

	if (!ctx.aggregateByCompany)
		tableColumns.push(createReportCompanyNameColumn(ctx.t));

	appendFiscalYearColumns(tableColumns, ctx);

	if (!ctx.aggregateByMonth)
		tableColumns.push(createReportMonthColumn(ctx.t, ctx.periodType));

	tableColumns.push(createReportOperationTypeColumn(ctx.t, ctx.operationTypeLabels));

	if (showOperatorLanguage && !ctx.aggregateByOperator)
		tableColumns.push(createReportOperatorColumn(ctx.t, ctx.operatorLabels));

	if (showOperatorLanguage && !ctx.aggregateByLanguage)
		tableColumns.push(createReportLanguageColumn(ctx.t));

	if (financialColumns.has("income"))
		tableColumns.push(createReportIncomeColumn(ctx.t, ctx.showRial));

	if (financialColumns.has("expense"))
		tableColumns.push(createReportExpenseColumn(ctx.t, ctx.showRial));

	if (financialColumns.has("profit")) {
		tableColumns.push({
			title: ctx.t("performance.columns.profit"),
			dataIndex: "profit_financial",
			search: false,
			width: 160,
			render: (_, row) => formatReportMoney(row.profit_financial, ctx.showRial),
		});
	}

	if (financialColumns.has("contractType"))
		tableColumns.push(createReportContractTypeColumn(ctx.t));

	if (financialColumns.has("unitPrice"))
		tableColumns.push(createReportUnitPriceColumn(ctx.t, ctx.showRial));

	if (financialColumns.has("karashabIncome")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.karashabIncome"),
			"income_financial",
			[...REPORT_FIELD_KEYS.karashabIncome],
			180,
			ctx.showRial,
		));
	}

	if (financialColumns.has("karashabExpense")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.karashabExpense"),
			"expense_financial",
			[...REPORT_FIELD_KEYS.karashabExpense],
			180,
			ctx.showRial,
		));
	}

	if (financialColumns.has("karashabProfit")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.karashabProfit"),
			"profit_financial",
			[...REPORT_FIELD_KEYS.karashabProfit],
			180,
			ctx.showRial,
		));
	}

	if (financialColumns.has("telecomIncome")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.telecomIncome"),
			"income_tci",
			[...REPORT_FIELD_KEYS.telecomIncome],
			180,
			ctx.showRial,
		));
	}

	if (financialColumns.has("firstPartyIncome")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.firstPartyIncome"),
			"income_first_side",
			[...REPORT_FIELD_KEYS.firstPartyIncome],
			180,
			ctx.showRial,
		));
	}

	if (financialColumns.has("regionIncome")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.regionIncome"),
			"income_area",
			[...REPORT_FIELD_KEYS.regionIncome],
			180,
			ctx.showRial,
		));
	}

	if (financialColumns.has("salesAgentIncome")) {
		tableColumns.push(createReportNumericValueColumn(
			ctx.t,
			ctx.t("performance.columns.salesAgentIncome"),
			"income_sales_agent",
			[...REPORT_FIELD_KEYS.salesAgentIncome],
			190,
			ctx.showRial,
		));
	}

	return tableColumns;
}

function buildReportTableColumns(
	layout: ReportServiceLayout,
	ctx: ReportTableColumnContext,
	financialColumns: Set<ReportFinancialColumnKey>,
	showOperatorLanguage: boolean,
): ProColumns<PerformanceReportRow>[] {
	if (layout === "openapi")
		return buildOpenApiReportTableColumns(ctx, financialColumns);
	if (layout === "sms")
		return buildSmsReportTableColumns(ctx, financialColumns);
	if (layout === "sms-commission")
		return buildSmsCommissionReportTableColumns(ctx, financialColumns);
	if (layout === "psp")
		return buildPspReportTableColumns(ctx, financialColumns);
	if (layout === "shahkar")
		return buildShahkarReportTableColumns(ctx, financialColumns);
	if (layout === "traffic")
		return buildTrafficReportTableColumns(ctx, financialColumns);
	if (layout === "sales-agency")
		return buildSalesAgencyReportTableColumns(ctx, financialColumns);
	return buildDefaultReportTableColumns(ctx, financialColumns, showOperatorLanguage);
}

function createOperatorGovernmentFilterColumns({ t, isVisible, canFilterSmsCommission, filters, onChange }: {
	t: TFunction<"translation", undefined>
	isVisible: boolean
	canFilterSmsCommission: boolean
	filters: OperatorGovernmentFilters
	onChange: (filters: Partial<OperatorGovernmentFilters>) => void
}): ProColumns<PerformanceReportRow>[] {
	const createSelectColumn = <Key extends keyof OperatorGovernmentFilters>(
		key: Key,
		title: string,
		options: Array<{ label: string, value: string }>,
		{ hidden = false, placeholder }: { hidden?: boolean, placeholder?: string } = {},
	): ProColumns<PerformanceReportRow> => ({
		title,
		dataIndex: `og_${key}`,
		hideInTable: true,
		hideInSearch: !isVisible || hidden,
		renderFormItem: (_, config) => (
			<Select
				mode={Array.isArray(filters[key]) ? "multiple" : undefined}
				allowClear={Array.isArray(filters[key])}
				placeholder={placeholder}
				options={options}
				value={filters[key]}
				onChange={(value) => {
					config.onChange?.(value);
					onChange({ [key]: value });
				}}
			/>
		),
	});
	const scopeOptions: Array<{ label: string, value: SmsCommissionScope }> = [
		{ label: t("performance.operatorGovernment.scope.both"), value: "both" },
		{ label: t("performance.operatorGovernment.scope.commissionOnly"), value: "commission_only" },
		{ label: t("performance.operatorGovernment.scope.smsOnly"), value: "sms_only" },
	];

	return [
		createSelectColumn("mode", t("performance.operatorGovernment.mode"), [
			{ label: t("performance.operatorGovernment.modes.operators"), value: "operators" },
			{ label: t("performance.operatorGovernment.modes.government"), value: "government" },
		]),
		createSelectColumn("smsCommission", t("performance.operatorGovernment.smsServiceType"), scopeOptions, { hidden: !canFilterSmsCommission }),
		createSelectColumn("operators", t("performance.columns.operator"), [
			{ label: t("performance.operator.mci"), value: "MCI" },
			{ label: t("performance.operator.irancell"), value: "IRANCELL" },
			{ label: t("performance.operator.other"), value: "OTHER" },
		], { placeholder: t("performance.operatorGovernment.allOperators") }),
		createSelectColumn("languages", t("performance.columns.language"), [
			{ label: t("performance.language.fa"), value: "FA" },
			{ label: t("performance.language.en"), value: "EN" },
		], { placeholder: t("performance.operatorGovernment.allLanguages") }),
	];
}

export function getPerformanceReportColumns({
	t,
	selectedServiceCode,
	selectedServiceName,
	serviceOptions,
	companyTypeOptions,
	contractTypeOptions,
	smsReportTypeOptions,
	selectedFinancialColumns,
	selectedAuditColumns,
	defaultConversionRatio,
	isDefaultConversionRatioInvalid,
	isAuditColumnsDisabled,
	selectedAggregation,
	selectedSmsReportType,
	selectedPeriodType,
	selectedCompanyType,
	isSmsService,
	isTrafficService,
	supportsOperatorLanguageAggregation,
	requiresCompanyType,
	onServiceChange,
	onCompanyTypeChange,
	onContractTypeChange,
	onSmsReportTypeChange,
	operatorGovernmentFilters,
	canFilterSmsCommission,
	onOperatorGovernmentFiltersChange,
	onDefaultConversionRatioChange,
	renderRowActions,
}: GetPerformanceReportColumnsArgs): ProColumns<PerformanceReportRow>[] {
	const operationTypeLabels = createOperationTypeLabels(t);
	const operatorLabels = createOperatorLabels(t);
	const financialColumns = new Set(selectedFinancialColumns);
	const reportServiceLayout = getReportServiceLayout(selectedServiceCode);
	const trafficLayout = isTrafficService
		? getTrafficReportLayout(selectedCompanyType)
		: getTrafficReportLayout(null);
	const isUnitConversion = isTrafficService && isUnitConversionCompanyType(selectedCompanyType);
	const isBaseUnitVisible = financialColumns.has("showBaseUnit");
	const tableColumnContext: ReportTableColumnContext = {
		t,
		operationTypeLabels,
		operatorLabels,
		companyTypeOptions,
		serviceNameFallback: selectedServiceName,
		periodType: selectedPeriodType,
		trafficLayout,
		aggregateByCompany: selectedAggregation.includes("by_company"),
		aggregateByMonth: selectedAggregation.includes("by_month"),
		aggregateByOperator: selectedAggregation.includes("by_operator"),
		aggregateByLanguage: selectedAggregation.includes("by_language"),
		showRial: financialColumns.has("rial"),
		showCompanyType: financialColumns.has("companyType"),
		isSalesAgencyOutbound: isOnlyCompanyType(selectedCompanyType, "OUTBOUND"),
		smsReportType: selectedSmsReportType,
	};

	const tableColumns = appendReportAuditColumns(
		buildReportTableColumns(
			reportServiceLayout,
			tableColumnContext,
			financialColumns,
			supportsOperatorLanguageAggregation,
		),
		isAuditColumnsDisabled ? new Set<ReportAuditColumnKey>() : new Set(selectedAuditColumns),
		t,
	);

	return [
		...tableColumns,
		{
			title: t("common.action"),
			valueType: "option",
			key: "option",
			width: 120,
			fixed: "right",
			align: "center",
			render: (_, row) => renderRowActions(row),
		},
		{
			title: t("performance.columns.service"),
			dataIndex: "service_id",
			hideInTable: true,
			valueType: "select",
			valueEnum: createValueEnum(serviceOptions),
			fieldProps: {
				allowClear: true,
				placeholder: t("performance.placeholders.selectService"),
				onChange: (value: number | null) => {
					const numericId = value == null ? null : Number(value);
					const selected = serviceOptions.find(option => option.value === numericId);
					onServiceChange(numericId, selected?.code ?? null);
				},
			},
		},
		{
			title: t("performance.labels.smsReportType"),
			dataIndex: "sms_report_type",
			hideInTable: true,
			hideInSearch: !isSmsService,
			renderFormItem: (_, config) => (
				<Radio.Group
					optionType="button"
					buttonStyle="solid"
					value={selectedSmsReportType}
					onChange={(event) => {
						const value = event.target.value as SmsReportType;
						config.onChange?.(value);
						onSmsReportTypeChange(value);
					}}
				>
					{smsReportTypeOptions.map(option => (
						<Radio.Button key={String(option.value)} value={option.value}>
							{option.label}
						</Radio.Button>
					))}
				</Radio.Group>
			),
		},
		...createOperatorGovernmentFilterColumns({
			t,
			isVisible: isSmsService && selectedSmsReportType === "operatorGovernment",
			canFilterSmsCommission,
			filters: operatorGovernmentFilters,
			onChange: onOperatorGovernmentFiltersChange,
		}),
		{
			title: t("performance.labels.companyType"),
			dataIndex: "company_type",
			hideInTable: true,
			hideInSearch: !requiresCompanyType,
			valueType: "select",
			valueEnum: createValueEnum(companyTypeOptions),
			fieldProps: {
				allowClear: true,
				mode: isTrafficService ? "multiple" : undefined,
				placeholder: t("performance.placeholders.select"),
				onChange: (value: string | number | Array<string | number> | null) => {
					const nextValue: CompanyTypeSelection = isTrafficService
						? (Array.isArray(value) && value.length > 0 ? value.map(String) : null)
						: (value == null || value === "" ? null : String(value));
					onCompanyTypeChange(nextValue);
				},
			},
		},
		{
			title: t("performance.columns.contractType"),
			dataIndex: "is_official",
			hideInTable: true,
			hideInSearch: !isSmsService && !isTrafficService,
			valueType: "select",
			valueEnum: createValueEnum(contractTypeOptions),
			fieldProps: {
				allowClear: false,
				onChange: (value: string | number) => {
					onContractTypeChange(String(value) as SmsContractTypeFilter);
				},
			},
		},
		{
			title: t("performance.columns.conversionRatio"),
			dataIndex: "default_conversion_ratio",
			hideInTable: true,
			hideInSearch: !isUnitConversion,
			renderFormItem: (_, config) => (
				<div>
					<InputNumber
						step={0.1}
						precision={4}
						disabled={isBaseUnitVisible}
						status={isDefaultConversionRatioInvalid ? "error" : undefined}
						value={defaultConversionRatio ?? undefined}
						placeholder={t("performance.placeholders.enterConversionRatio")}
						style={{ width: "100%" }}
						onChange={(value) => {
							const numeric = value == null ? null : Number(value);
							const nextValue = Number.isFinite(numeric as number) ? Number(numeric) : null;
							config.onChange?.(nextValue ?? undefined);
							onDefaultConversionRatioChange(nextValue);
						}}
					/>
					{isDefaultConversionRatioInvalid && (
						<Typography.Text type="danger" className="mt-1 block text-xs">
							{t("performance.validation.traffic.conversionRatioRange")}
						</Typography.Text>
					)}
				</div>
			),
		},
	];
}
