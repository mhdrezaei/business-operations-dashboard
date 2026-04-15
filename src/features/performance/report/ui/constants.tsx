import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { PerformanceReportRow } from "../model/performance.report.types";
import type { ReportFinancialColumnKey } from "./export";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { Radio, Select } from "antd";

export interface ReportSelectOption {
	label: string
	value: string | number
}

export interface ReportServiceOption extends ReportSelectOption {
	value: number
	code: string
}

export type SmsReportType = "normal" | "finance" | "summary";
export type SmsContractTypeFilter = "all" | "official" | "unofficial";
export type TrafficCompanyType = "CP" | "IXP" | "TCI" | "PREMIUM";

export const TRAFFIC_COMPANY_TYPE_OPTIONS: Array<{ label: TrafficCompanyType, value: TrafficCompanyType }> = [
	{ label: "CP", value: "CP" },
	{ label: "IXP", value: "IXP" },
	{ label: "TCI", value: "TCI" },
	{ label: "PREMIUM", value: "PREMIUM" },
];

export interface GetPerformanceReportColumnsArgs {
	t: TFunction<"translation", undefined>
	serviceOptions: ReportServiceOption[]
	yearOptions: ReportSelectOption[]
	periodOptions: ReportSelectOption[]
	companyOptions: ReportSelectOption[]
	trafficCompanyTypeOptions: ReportSelectOption[]
	contractTypeOptions: ReportSelectOption[]
	smsReportTypeOptions: ReportSelectOption[]
	financialColumnOptions: ReportSelectOption[]
	selectedFinancialColumns: ReportFinancialColumnKey[]
	selectedSmsReportType: SmsReportType
	isSmsService: boolean
	isSmsCommissionService: boolean
	isTrafficService: boolean
	isPeriodDisabled: boolean
	isCompanyDisabled: boolean
	onServiceChange: (serviceId: number | null, serviceCode: string | null) => void
	onYearChange: (year: number | null) => void
	onPeriodsChange: (periods: string[]) => void
	onTrafficCompanyTypeChange: (value: TrafficCompanyType | null) => void
	onContractTypeChange: (value: SmsContractTypeFilter) => void
	onSmsReportTypeChange: (value: SmsReportType) => void
	onFinancialColumnsChange: (columns: ReportFinancialColumnKey[]) => void
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

function formatNumeric(value: unknown) {
	const numeric = toNullableNumber(value);
	if (numeric == null)
		return "-";
	return numeric.toLocaleString("en-US");
}

function pickReportValue(row: PerformanceReportRow, keys: string[]) {
	const record = row as Record<string, unknown>;
	for (const key of keys) {
		const value = record[key];
		if (value !== undefined && value !== null && value !== "")
			return value;
	}
	return null;
}

function normalizePeriods(values: Array<string | number> | undefined | null) {
	if (!Array.isArray(values))
		return [];
	return values
		.map(item => String(item ?? "").trim())
		.filter(Boolean);
}

function normalizeFinancialColumns(values: Array<string | number> | undefined | null) {
	if (!Array.isArray(values))
		return [];

	const allowed = new Set<ReportFinancialColumnKey>([
		"income",
		"expense",
		"profit",
		"total",
		"contractType",
		"unitPrice",
		"karashabIncome",
		"karashabExpense",
		"karashabProfit",
		"telecomIncome",
		"firstPartyIncome",
		"regionIncome",
		"salesAgentIncome",
	]);
	const dedup = new Set<ReportFinancialColumnKey>();
	values.forEach((item) => {
		const value = String(item ?? "").trim() as ReportFinancialColumnKey;
		if (allowed.has(value))
			dedup.add(value);
	});

	return Array.from(dedup);
}

function getContractTypeLabel(t: TFunction<"translation", undefined>, value: unknown) {
	if (value === true)
		return t("performance.contractType.official");
	if (value === false)
		return t("performance.contractType.unofficial");
	return "-";
}

export function getPerformanceReportColumns({
	t,
	serviceOptions,
	yearOptions,
	periodOptions,
	companyOptions,
	trafficCompanyTypeOptions,
	contractTypeOptions,
	smsReportTypeOptions,
	financialColumnOptions,
	selectedFinancialColumns,
	selectedSmsReportType,
	isSmsService,
	isSmsCommissionService,
	isTrafficService,
	isPeriodDisabled,
	isCompanyDisabled,
	onServiceChange,
	onYearChange,
	onPeriodsChange,
	onTrafficCompanyTypeChange,
	onContractTypeChange,
	onSmsReportTypeChange,
	onFinancialColumnsChange,
}: GetPerformanceReportColumnsArgs): ProColumns<PerformanceReportRow>[] {
	const operationTypeLabels = createOperationTypeLabels(t);
	const financialColumns = new Set(selectedFinancialColumns);

	const tableColumns: ProColumns<PerformanceReportRow>[] = [
		{
			dataIndex: "index",
			title: t("common.index"),
			valueType: "indexBorder",
			width: 80,
			hideInSearch: true,
		},
		{
			title: t("performance.columns.id"),
			dataIndex: "id",
			search: false,
			width: 110,
		},
		{
			title: t("performance.columns.companyName"),
			dataIndex: "company_name",
			search: false,
			width: 260,
			render: (_, row) => row.company_name ?? "-",
		},
		{
			title: t("performance.columns.year"),
			dataIndex: "sh_year",
			search: false,
			width: 100,
			render: (_, row) => row.sh_year ?? "-",
		},
		{
			title: t("performance.columns.month"),
			dataIndex: "sh_month",
			search: false,
			width: 110,
			render: (_, row) => {
				const month = Number(row.sh_month);
				const found = MONTH_OPTIONS.find(option => option.value === month);
				return found?.label ?? row.sh_month ?? "-";
			},
		},
		{
			title: t("performance.columns.operationType"),
			dataIndex: "operation_type",
			search: false,
			width: 190,
			render: (_, row) => {
				if (!row.operation_type)
					return "-";
				return operationTypeLabels[row.operation_type] ?? row.operation_type;
			},
		},
	];

	if (financialColumns.has("total")) {
		tableColumns.push({
			title: t("performance.columns.total"),
			dataIndex: "value",
			search: false,
			width: 160,
			render: (_, row) => formatNumeric(row.value),
		});
	}

	if (financialColumns.has("income")) {
		tableColumns.push({
			title: t("performance.columns.income"),
			dataIndex: "income_financial",
			search: false,
			width: 160,
			render: (_, row) => formatNumeric(row.income_financial),
		});
	}

	if (financialColumns.has("expense")) {
		tableColumns.push({
			title: t("performance.columns.expense"),
			dataIndex: "expense_financial",
			search: false,
			width: 160,
			render: (_, row) => formatNumeric(row.expense_financial),
		});
	}

	if (financialColumns.has("profit")) {
		tableColumns.push({
			title: t("performance.columns.profit"),
			dataIndex: "profit_financial",
			search: false,
			width: 160,
			render: (_, row) => formatNumeric(row.profit_financial),
		});
	}

	if (financialColumns.has("contractType")) {
		tableColumns.push({
			title: t("performance.columns.contractType"),
			dataIndex: "is_official",
			search: false,
			width: 160,
			render: (_, row) => getContractTypeLabel(t, row.is_official),
		});
	}

	if (financialColumns.has("unitPrice")) {
		tableColumns.push({
			title: t("performance.columns.unitPrice"),
			dataIndex: "unit_price",
			search: false,
			width: 160,
			render: (_, row) => formatNumeric(pickReportValue(row, ["price", "unit_price", "sale_rate"])),
		});
	}

	if (financialColumns.has("karashabIncome")) {
		tableColumns.push({
			title: t("performance.columns.karashabIncome"),
			dataIndex: "karashab_income",
			search: false,
			width: 180,
			render: (_, row) => formatNumeric(pickReportValue(row, ["karashab_income", "income_karashab", "karashabIncome"])),
		});
	}

	if (financialColumns.has("karashabExpense")) {
		tableColumns.push({
			title: t("performance.columns.karashabExpense"),
			dataIndex: "karashab_expense",
			search: false,
			width: 180,
			render: (_, row) => formatNumeric(pickReportValue(row, ["karashab_expense", "expense_karashab", "karashabExpense"])),
		});
	}

	if (financialColumns.has("karashabProfit")) {
		tableColumns.push({
			title: t("performance.columns.karashabProfit"),
			dataIndex: "karashab_profit",
			search: false,
			width: 180,
			render: (_, row) => formatNumeric(pickReportValue(row, ["karashab_profit", "profit_karashab", "karashabProfit"])),
		});
	}

	if (financialColumns.has("telecomIncome")) {
		tableColumns.push({
			title: t("performance.columns.telecomIncome"),
			dataIndex: "telecom_income",
			search: false,
			width: 180,
			render: (_, row) => formatNumeric(pickReportValue(row, ["mokhaberat_income", "telecom_income", "income_mokhaberat", "income_telecom"])),
		});
	}

	if (financialColumns.has("firstPartyIncome")) {
		tableColumns.push({
			title: t("performance.columns.firstPartyIncome"),
			dataIndex: "first_party_income",
			search: false,
			width: 180,
			render: (_, row) => formatNumeric(pickReportValue(row, ["first_party_income", "income_first_party", "firstPartyIncome"])),
		});
	}

	if (financialColumns.has("regionIncome")) {
		tableColumns.push({
			title: t("performance.columns.regionIncome"),
			dataIndex: "region_income",
			search: false,
			width: 180,
			render: (_, row) => formatNumeric(pickReportValue(row, ["area_income", "region_income", "income_area", "income_region"])),
		});
	}

	if (financialColumns.has("salesAgentIncome")) {
		tableColumns.push({
			title: t("performance.columns.salesAgentIncome"),
			dataIndex: "sales_agent_income",
			search: false,
			width: 190,
			render: (_, row) => formatNumeric(pickReportValue(row, ["sales_agent_income", "income_sales_agent", "salesAgentIncome"])),
		});
	}

	return [
		...tableColumns,
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
		{
			title: t("performance.labels.trafficCompanyType"),
			dataIndex: "company_type",
			hideInTable: true,
			hideInSearch: !isTrafficService,
			valueType: "select",
			valueEnum: createValueEnum(trafficCompanyTypeOptions),
			fieldProps: {
				allowClear: true,
				placeholder: t("performance.placeholders.select"),
				onChange: (value: string | number | null) => {
					const nextValue = value == null || value === "" ? null : String(value) as TrafficCompanyType;
					onTrafficCompanyTypeChange(nextValue);
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
			title: t("performance.columns.year"),
			dataIndex: "sh_year",
			hideInTable: true,
			valueType: "select",
			valueEnum: createValueEnum(yearOptions),
			fieldProps: {
				allowClear: true,
				placeholder: t("performance.placeholders.selectYear"),
				onChange: (value: string | number | null) => {
					const year = value == null || value === "" ? null : Number(value);
					onYearChange(Number.isFinite(year as number) ? Number(year) : null);
				},
			},
		},
		{
			title: t("performance.columns.month"),
			dataIndex: "sh_periods",
			hideInTable: true,
			valueType: "select",
			valueEnum: createValueEnum(periodOptions),
			fieldProps: {
				mode: "multiple",
				maxTagCount: "responsive",
				allowClear: true,
				disabled: isPeriodDisabled,
				placeholder: isPeriodDisabled ? t("performance.placeholders.selectYearFirst") : t("performance.placeholders.selectMonths"),
				onChange: (values: Array<string | number>) => {
					onPeriodsChange(normalizePeriods(values));
				},
			},
		},
		{
			title: t("performance.columns.company"),
			dataIndex: "company_ids",
			hideInTable: true,
			hideInSearch: isSmsService || isSmsCommissionService,
			valueType: "select",
			valueEnum: createValueEnum(companyOptions),
			fieldProps: {
				mode: "multiple",
				maxTagCount: "responsive",
				allowClear: true,
				disabled: isCompanyDisabled,
				placeholder: isCompanyDisabled ? t("performance.placeholders.selectMonthFirst") : t("performance.placeholders.selectCompanies"),
			},
		},
		{
			title: t("performance.labels.financialColumns"),
			dataIndex: "financial_columns",
			hideInTable: true,
			renderFormItem: (_, config) => (
				<Select
					mode="multiple"
					maxTagCount="responsive"
					allowClear={false}
					placeholder={t("performance.placeholders.selectFinancialColumns")}
					value={(config.value as Array<string | number> | undefined)?.map(String) ?? []}
					onChange={(values) => {
						config.onChange?.(values);
						onFinancialColumnsChange(normalizeFinancialColumns(values));
					}}
					options={financialColumnOptions.map(option => ({
						label: option.label,
						value: String(option.value),
					}))}
				/>
			),
		},
	];
}
