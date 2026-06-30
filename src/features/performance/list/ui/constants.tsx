import type { CompanyTypeOption } from "#src/api/user/types";
import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { PerformanceListRow } from "../model/performance.list.types";
import { pickCompanyTypeToken } from "#src/features/performance/shared/model/performance.helpers";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { Tag } from "antd";

type ServiceCode = | "openapi"
  | "commercial"
  | "traffic"
  | "psp"
  | "shahkar"
  | "sms"
  | "sms-commission"
  | "sms_commission";

export interface GetPerformanceColumnsArgs {
	t: TFunction<"translation", undefined>
	selectedServiceId: number | null
	selectedServiceCode: string | null
	selectedCompanyType: string | null
	permittedCompanyTypeOptions: CompanyTypeOption[]
	setSelectedService: (serviceId: number | null, serviceCode: string | null) => void
	serviceOptions: Array<{ label: string, value: number, code: string }>
	companyOptions: Array<{ label: string, value: number }>
	isCompanyDisabled: boolean
	companyPlaceholder: string
	salesAgentOptions: Array<{ label: string, value: number }>
	performanceMonthsByYear: Map<number, number[]>
	selectedYear: number | null
	periodOptionsLoading: boolean
}

const YEAR_OPTIONS = Array.from({ length: 20 }, (_, index) => {
	const year = 1400 + index;
	return { label: String(year), value: year };
});

const OPERATION_TYPE_OPTIONS = [
	"BILL_INQUIRY",
	"RECEIPT_REGISTER",
	"TRAFFIC_REVENUE",
	"TRAFFIC_PACKAGE_COUNT",
	"IRANCELL_FA",
	"IRANCELL_EN",
	"MCI_FA",
	"MCI_EN",
	"OTHER_FA",
	"OTHER_EN",
] as const;

function toNumber(value: unknown) {
	if (value == null || value === "")
		return null;
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

function formatNumeric(value: unknown) {
	const numeric = toNumber(value);
	if (numeric == null)
		return "-";
	return numeric.toLocaleString("en-US");
}

function isSmsCommissionService(code: string | null | undefined) {
	return code === "sms-commission" || code === "sms_commission";
}

export function getPerformanceColumns({
	t,
	selectedServiceCode,
	selectedCompanyType,
	permittedCompanyTypeOptions,
	setSelectedService,
	serviceOptions,
	companyOptions,
	isCompanyDisabled,
	companyPlaceholder,
	salesAgentOptions,
	performanceMonthsByYear,
	selectedYear,
	periodOptionsLoading,
}: GetPerformanceColumnsArgs): ProColumns<PerformanceListRow>[] {
	const serviceNameById = serviceOptions.reduce((acc, it) => {
		acc[String(it.value)] = String(it.label);
		return acc;
	}, {} as Record<string, string>);
	const companyNameById = companyOptions.reduce((acc, it) => {
		acc[String(it.value)] = String(it.label);
		return acc;
	}, {} as Record<string, string>);
	const companyTypeLabelByKey = permittedCompanyTypeOptions.reduce((acc, item) => {
		acc[item.key] = item.value;
		return acc;
	}, {} as Record<string, string>);
	const serviceCode = (selectedServiceCode ?? "").trim().toLowerCase() as ServiceCode | "";

	const ORDERING_OPTIONS = [
		{ label: t("performance.ordering.newestId"), value: "-id" },
		{ label: t("performance.ordering.oldestId"), value: "id" },
		{ label: t("performance.ordering.yearDesc"), value: "-sh_year" },
		{ label: t("performance.ordering.yearAsc"), value: "sh_year" },
		{ label: t("performance.ordering.monthDesc"), value: "-sh_month" },
		{ label: t("performance.ordering.monthAsc"), value: "sh_month" },
		{ label: t("performance.ordering.valueDesc"), value: "-value" },
		{ label: t("performance.ordering.valueAsc"), value: "value" },
	] as const;

	const LANGUAGE_OPTIONS = [
		{ label: t("performance.language.fa"), value: "FA" },
		{ label: t("performance.language.en"), value: "EN" },
	] as const;

	const OPERATOR_OPTIONS = [
		{ label: t("performance.operator.irancell"), value: "IRANCELL" },
		{ label: t("performance.operator.mci"), value: "MCI" },
		{ label: t("performance.operator.other"), value: "OTHER" },
	] as const;

	const hasSelectedService = Boolean(serviceCode);
	const isOpenApi = serviceCode === "openapi";
	const isPsp = serviceCode === "psp";
	const isTraffic = serviceCode === "traffic";
	const isSms = serviceCode === "sms";
	const requiresCompanyType = isSms || isPsp || isTraffic;
	const isSmsCommission = isSmsCommissionService(serviceCode);
	const isCommercial = serviceCode === "commercial";
	const isMonthlyAggregatedService = isOpenApi || isSms || isSmsCommission;
	const hideNonMatchingServiceColumn = (isVisibleForSelectedService: boolean) =>
		hasSelectedService ? !isVisibleForSelectedService : true;

	// For traffic, once a company type is selected, restrict the year/month
	// filters to the periods that actually have performance data.
	const usePeriodGaps = isTraffic && !!selectedCompanyType;

	const defaultYearEnum = YEAR_OPTIONS.reduce((acc, option) => {
		acc[String(option.value)] = option.label;
		return acc;
	}, {} as Record<string, string>);
	const defaultMonthEnum = MONTH_OPTIONS.reduce((acc, option) => {
		acc[String(option.value)] = option.label;
		return acc;
	}, {} as Record<string, string>);

	const gapsYearEnum = Array.from(performanceMonthsByYear.keys())
		.sort((a, b) => a - b)
		.reduce((acc, value) => {
			acc[String(value)] = String(value);
			return acc;
		}, {} as Record<string, string>);
	const gapsMonthEnum = (selectedYear != null ? performanceMonthsByYear.get(selectedYear) ?? [] : [])
		.reduce((acc, value) => {
			const found = MONTH_OPTIONS.find(option => option.value === value);
			acc[String(value)] = found?.label ?? String(value);
			return acc;
		}, {} as Record<string, string>);

	const yearSearchEnum = usePeriodGaps ? gapsYearEnum : defaultYearEnum;
	const monthSearchEnum = usePeriodGaps ? gapsMonthEnum : defaultMonthEnum;

	return [
		{
			dataIndex: "index",
			title: t("common.index"),
			valueType: "indexBorder",
			width: 80,
			hideInSearch: true,
		},
		{
			title: t("performance.columns.service"),
			dataIndex: "service_name",
			search: false,
			width: 160,
			render: (_, r) => (r as any).service_name ?? serviceNameById[String((r as any).service)] ?? "-",
		},
		{
			title: t("performance.columns.service"),
			dataIndex: "service",
			hideInTable: true,
			valueType: "select",
			valueEnum: serviceOptions.reduce((acc, option) => {
				acc[String(option.value)] = option.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: {
				allowClear: true,
				placeholder: t("performance.placeholders.selectService"),
				onChange: (value: number | null) => {
					const numericId = value == null ? null : Number(value);
					const selected = serviceOptions.find(option => option.value === numericId);
					setSelectedService(numericId, selected?.code ?? null);
				},
			},
		},
		{
			title: t("performance.columns.company"),
			dataIndex: "company_name",
			search: false,
			width: 220,
			render: (_, r) => (r as any).company_name ?? companyNameById[String((r as any).company)] ?? "-",
		},
		{
			title: t("performance.columns.companyType"),
			dataIndex: "company_type",
			hideInTable: true,
			hideInSearch: !requiresCompanyType,
			valueType: "select",
			valueEnum: permittedCompanyTypeOptions.reduce((acc, option) => {
				acc[option.key] = option.value;
				return acc;
			}, {} as Record<string, string>),
		},
		{
			title: t("performance.columns.company"),
			dataIndex: "company",
			hideInTable: true,
			valueType: "select",
			valueEnum: companyOptions.reduce((acc, option) => {
				acc[String(option.value)] = option.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: {
				allowClear: true,
				disabled: isCompanyDisabled || (requiresCompanyType && !selectedCompanyType),
				placeholder: companyPlaceholder,
			},
		},
		{
			title: t("performance.columns.search"),
			dataIndex: "search",
			hideInTable: true,
			hideInSearch: !hasSelectedService,
			valueType: "text",
		},
		{
			title: t("performance.columns.year"),
			dataIndex: "sh_year",
			width: 100,
			hideInSearch: true,
			render: (_, row) => row.sh_year ?? "-",
		},
		{
			title: t("performance.columns.year"),
			dataIndex: "sh_year",
			hideInTable: true,
			hideInSearch: !hasSelectedService,
			valueType: "select",
			valueEnum: yearSearchEnum,
			fieldProps: {
				allowClear: true,
				placeholder: t("performance.placeholders.year"),
				loading: usePeriodGaps && periodOptionsLoading,
			},
		},
		{
			title: t("performance.columns.month"),
			dataIndex: "sh_month",
			width: 100,
			hideInSearch: true,
			render: (_, row) => {
				const month = Number(row.sh_month);
				const found = MONTH_OPTIONS.find(option => option.value === month);
				return found?.label ?? row.sh_month ?? "-";
			},
		},
		{
			title: t("performance.columns.month"),
			dataIndex: "sh_month",
			hideInTable: true,
			hideInSearch: !hasSelectedService,
			valueType: "select",
			valueEnum: monthSearchEnum,
			fieldProps: {
				allowClear: true,
				placeholder: usePeriodGaps && selectedYear == null
					? t("performance.placeholders.selectYearFirst")
					: t("performance.placeholders.month"),
				disabled: usePeriodGaps && selectedYear == null,
				loading: usePeriodGaps && periodOptionsLoading,
			},
		},
		{
			title: t("performance.columns.ordering"),
			dataIndex: "ordering",
			hideInTable: true,
			hideInSearch: !hasSelectedService,
			valueType: "select",
			valueEnum: ORDERING_OPTIONS.reduce((acc, option) => {
				acc[option.value] = option.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: { allowClear: true },
		},
		// {
		// 	title: t("performance.columns.fromGregorianDate"),
		// 	dataIndex: "gr_month_start_after",
		// 	hideInTable: true,
		// 	hideInSearch: !hasSelectedService || isPsp,
		// 	valueType: "date",
		// },
		// {
		// 	title: t("performance.columns.toGregorianDate"),
		// 	dataIndex: "gr_month_start_before",
		// 	hideInTable: true,
		// 	hideInSearch: !hasSelectedService || isPsp,
		// 	valueType: "date",
		// },
		{
			title: t("performance.columns.value"),
			dataIndex: "value",
			width: 140,
			search: false,
			render: (_, row) => formatNumeric(row.value),
		},
		{
			title: t("performance.columns.income"),
			dataIndex: "income",
			width: 140,
			hideInTable: hideNonMatchingServiceColumn(isPsp || isTraffic || isCommercial),
			search: false,
			render: (_, row) => formatNumeric(row.income),
		},
		{
			title: t("performance.columns.operationType"),
			dataIndex: "operation_type",
			width: 170,
			hideInTable: hideNonMatchingServiceColumn(isOpenApi && !isMonthlyAggregatedService),
			hideInSearch: !isOpenApi || isMonthlyAggregatedService,
			valueType: "select",
			valueEnum: OPERATION_TYPE_OPTIONS.reduce((acc, option) => {
				acc[option] = option;
				return acc;
			}, {} as Record<string, string>),
			render: (_, row) => row.operation_type ?? "-",
		},
		{
			title: t("performance.columns.operator"),
			dataIndex: "operator",
			width: 120,
			hideInTable: hideNonMatchingServiceColumn((isSms || isSmsCommission) && !isMonthlyAggregatedService),
			hideInSearch: !(isSms || isSmsCommission) || isMonthlyAggregatedService,
			valueType: "select",
			valueEnum: OPERATOR_OPTIONS.reduce((acc, option) => {
				acc[option.value] = option.label;
				return acc;
			}, {} as Record<string, string>),
			render: (_, row) => row.operator ?? "-",
		},
		{
			title: t("performance.columns.language"),
			dataIndex: "language",
			width: 100,
			hideInTable: hideNonMatchingServiceColumn((isSms || isSmsCommission) && !isMonthlyAggregatedService),
			hideInSearch: !(isSms || isSmsCommission) || isMonthlyAggregatedService,
			valueType: "select",
			valueEnum: LANGUAGE_OPTIONS.reduce((acc, option) => {
				acc[option.value] = option.label;
				return acc;
			}, {} as Record<string, string>),
			render: (_, row) => {
				if (!row.language)
					return "-";
				return row.language === "FA" ? t("performance.language.fa") : row.language === "EN" ? t("performance.language.en") : row.language;
			},
		},
		{
			title: t("performance.columns.official"),
			dataIndex: "is_official",
			width: 100,
			hideInTable: hideNonMatchingServiceColumn(isSms || isTraffic),
			hideInSearch: !(isSms || isTraffic),
			valueType: "select",
			valueEnum: {
				true: { text: t("common.yes") },
				false: { text: t("common.no") },
			},
			render: (_, row) => {
				const raw = row.is_official;
				if (raw == null)
					return "-";
				return <Tag>{raw ? t("common.yes") : t("common.no")}</Tag>;
			},
		},
		{
			title: t("performance.columns.salesAgent"),
			dataIndex: "sales_agent",
			width: 150,
			hideInTable: hideNonMatchingServiceColumn(isSmsCommission),
			hideInSearch: !isSmsCommission,
			valueType: "select",
			valueEnum: salesAgentOptions.reduce((acc, option) => {
				acc[String(option.value)] = option.label;
				return acc;
			}, {} as Record<string, string>),
			render: (_, row) => row.sales_agent_name ?? row.sales_agent ?? "-",
		},
		{
			title: t("performance.columns.companyType"),
			dataIndex: "company_type",
			width: 120,
			hideInTable: hideNonMatchingServiceColumn(requiresCompanyType),
			hideInSearch: true,
			render: (_, row) => {
				const companyType = pickCompanyTypeToken(row.company_type);
				if (!companyType)
					return "-";
				return companyTypeLabelByKey[companyType] ?? companyType;
			},
		},
		{
			title: t("performance.columns.location"),
			dataIndex: "location",
			width: 140,
			hideInTable: hideNonMatchingServiceColumn(isTraffic),
			hideInSearch: !isTraffic,
			valueType: "text",
			render: (_, row) => row.location ?? "-",
		},
		{
			title: t("performance.columns.customerName"),
			dataIndex: "customer_name",
			width: 170,
			hideInTable: hideNonMatchingServiceColumn(isCommercial),
			hideInSearch: !isCommercial,
			valueType: "text",
		},
		{
			title: t("performance.columns.customerNationalId"),
			dataIndex: "customer_nic",
			width: 150,
			hideInTable: hideNonMatchingServiceColumn(isCommercial),
			hideInSearch: !isCommercial,
			valueType: "text",
		},
		{
			title: t("performance.columns.provinceCode"),
			dataIndex: "province_code",
			width: 130,
			hideInTable: hideNonMatchingServiceColumn(isCommercial),
			hideInSearch: !isCommercial,
			valueType: "text",
		},
		{
			title: t("performance.columns.commercialServiceType"),
			dataIndex: "service_type",
			width: 140,
			hideInTable: hideNonMatchingServiceColumn(isCommercial),
			hideInSearch: !isCommercial,
			valueType: "text",
		},
		{
			title: t("performance.columns.valueReceive"),
			dataIndex: "value_receive",
			width: 140,
			hideInTable: hideNonMatchingServiceColumn(isTraffic),
			search: false,
			render: (_, row) => formatNumeric(row.value_receive),
		},
		{
			title: t("performance.columns.expense"),
			dataIndex: "expense",
			width: 140,
			hideInTable: hideNonMatchingServiceColumn(isTraffic || isCommercial),
			search: false,
			render: (_, row) => formatNumeric(row.expense),
		},
		{
			title: t("performance.columns.profit"),
			dataIndex: "profit",
			width: 140,
			hideInTable: hideNonMatchingServiceColumn(isTraffic),
			search: false,
			render: (_, row) => formatNumeric(row.profit),
		},
	];
}
