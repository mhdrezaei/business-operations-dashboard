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

const OPERATION_TYPE_LABELS: Record<string, string> = {
	BILL_INQUIRY: "استعلام قبض",
	RECEIPT_REGISTER: "ثبت وصولی",
};

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
	return [
		{
			dataIndex: "index",
			title: t("common.index"),
			valueType: "indexBorder",
			width: 80,
			hideInSearch: true,
		},
		{
			title: "شناسه",
			dataIndex: "id",
			search: false,
			width: 110,
		},
		{
			title: "نام سرویس",
			dataIndex: "service_name",
			search: false,
			width: 180,
			render: (_, row) => String(row.service_name ?? selectedServiceName ?? "-"),
		},
		{
			title: "نام شرکت",
			dataIndex: "company_name",
			search: false,
			width: 260,
			render: (_, row) => row.company_name ?? "-",
		},
		{
			title: "سال",
			dataIndex: "sh_year",
			search: false,
			width: 100,
			render: (_, row) => row.sh_year ?? "-",
		},
		{
			title: "ماه",
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
			title: "تعداد",
			dataIndex: "value",
			search: false,
			width: 140,
			render: (_, row) => formatNumeric(row.value),
		},
		{
			title: "نوع عملیات",
			dataIndex: "operation_type",
			search: false,
			width: 190,
			render: (_, row) => {
				if (!row.operation_type)
					return "-";
				return OPERATION_TYPE_LABELS[row.operation_type] ?? row.operation_type;
			},
		},
		{
			title: "درآمد",
			dataIndex: "income_financial",
			search: false,
			width: 160,
			render: (_, row) => formatNumeric(row.income_financial),
		},
		{
			title: "هزینه",
			dataIndex: "expense_financial",
			search: false,
			width: 160,
			render: (_, row) => formatNumeric(row.expense_financial),
		},
		{
			title: "سود",
			dataIndex: "profit_financial",
			search: false,
			width: 160,
			render: (_, row) => formatNumeric(row.profit_financial),
		},
		{
			title: "سرویس",
			dataIndex: "service_id",
			hideInTable: true,
			valueType: "select",
			valueEnum: createValueEnum(serviceOptions),
			fieldProps: {
				allowClear: true,
				placeholder: "سرویس را انتخاب کنید",
				onChange: (value: number | null) => {
					const numericId = value == null ? null : Number(value);
					const selected = serviceOptions.find(option => option.value === numericId);
					onServiceChange(numericId, selected?.code ?? null);
				},
			},
		},
		{
			title: "سال",
			dataIndex: "sh_year",
			hideInTable: true,
			valueType: "select",
			valueEnum: createValueEnum(yearOptions),
			fieldProps: {
				allowClear: true,
				placeholder: "سال را انتخاب کنید",
				onChange: (value: string | number | null) => {
					const year = value == null || value === "" ? null : Number(value);
					onYearChange(Number.isFinite(year as number) ? Number(year) : null);
				},
			},
		},
		{
			title: "ماه",
			dataIndex: "sh_periods",
			hideInTable: true,
			valueType: "select",
			valueEnum: createValueEnum(periodOptions),
			fieldProps: {
				mode: "multiple",
				maxTagCount: "responsive",
				allowClear: true,
				disabled: isPeriodDisabled,
				placeholder: isPeriodDisabled ? "ابتدا سال را انتخاب کنید" : "ماه‌ها را انتخاب کنید",
				onChange: (values: Array<string | number>) => {
					onPeriodsChange(normalizePeriods(values));
				},
			},
		},
		{
			title: "شرکت",
			dataIndex: "company_ids",
			hideInTable: true,
			valueType: "select",
			valueEnum: createValueEnum(companyOptions),
			fieldProps: {
				mode: "multiple",
				maxTagCount: "responsive",
				allowClear: true,
				disabled: isCompanyDisabled,
				placeholder: isCompanyDisabled ? "ابتدا ماه را انتخاب کنید" : "شرکت‌ها را انتخاب کنید",
			},
		},
	];
}
