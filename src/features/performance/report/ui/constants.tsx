import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { PerformanceReportRow } from "../model/performance.report.types";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";

export interface ReportSelectOption {
	label: string
	value: string | number
}

export interface ReportServiceOption extends ReportSelectOption {
	value: number
	code: string
}

export interface GetPerformanceReportColumnsArgs {
	t: TFunction<"translation", undefined>
	selectedServiceName: string | null
	serviceOptions: ReportServiceOption[]
	yearOptions: ReportSelectOption[]
	periodOptions: ReportSelectOption[]
	companyOptions: ReportSelectOption[]
	isPeriodDisabled: boolean
	isCompanyDisabled: boolean
	onServiceChange: (serviceId: number | null, serviceCode: string | null) => void
	onYearChange: (year: number | null) => void
	onPeriodsChange: (periods: string[]) => void
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

function normalizePeriods(values: Array<string | number> | undefined | null) {
	if (!Array.isArray(values))
		return [];
	return values
		.map(item => String(item ?? "").trim())
		.filter(Boolean);
}

export function getPerformanceReportColumns({
	t,
	selectedServiceName,
	serviceOptions,
	yearOptions,
	periodOptions,
	companyOptions,
	isPeriodDisabled,
	isCompanyDisabled,
	onServiceChange,
	onYearChange,
	onPeriodsChange,
}: GetPerformanceReportColumnsArgs): ProColumns<PerformanceReportRow>[] {
	const operationTypeLabels = createOperationTypeLabels(t);

	return [
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
			title: t("performance.columns.serviceName"),
			dataIndex: "service_name",
			search: false,
			width: 180,
			render: (_, row) => String(row.service_name ?? selectedServiceName ?? "-"),
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
			title: t("performance.columns.count"),
			dataIndex: "value",
			search: false,
			width: 140,
			render: (_, row) => formatNumeric(row.value),
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
		{
			title: t("performance.columns.income"),
			dataIndex: "income_financial",
			search: false,
			width: 160,
			render: (_, row) => formatNumeric(row.income_financial),
		},
		{
			title: t("performance.columns.expense"),
			dataIndex: "expense_financial",
			search: false,
			width: 160,
			render: (_, row) => formatNumeric(row.expense_financial),
		},
		{
			title: t("performance.columns.profit"),
			dataIndex: "profit_financial",
			search: false,
			width: 160,
			render: (_, row) => formatNumeric(row.profit_financial),
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
	];
}
