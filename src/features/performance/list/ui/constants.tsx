import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { PerformanceListRow } from "../model/performance.list.types";
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
	setSelectedService: (serviceId: number | null, serviceCode: string | null) => void
	serviceOptions: Array<{ label: string, value: number, code: string }>
	companyOptions: Array<{ label: string, value: number }>
	isCompanyDisabled: boolean
	companyPlaceholder: string
	salesAgentOptions: Array<{ label: string, value: number }>
}

const YEAR_OPTIONS = Array.from({ length: 20 }, (_, index) => {
	const year = 1400 + index;
	return { label: String(year), value: year };
});

const ORDERING_OPTIONS = [
	{ label: "جدیدترین (شناسه)", value: "-id" },
	{ label: "قدیمی‌ترین (شناسه)", value: "id" },
	{ label: "سال (نزولی)", value: "-sh_year" },
	{ label: "سال (صعودی)", value: "sh_year" },
	{ label: "ماه (نزولی)", value: "-sh_month" },
	{ label: "ماه (صعودی)", value: "sh_month" },
	{ label: "مقدار (نزولی)", value: "-value" },
	{ label: "مقدار (صعودی)", value: "value" },
] as const;

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

const LANGUAGE_OPTIONS = [
	{ label: "فارسی", value: "FA" },
	{ label: "انگلیسی", value: "EN" },
] as const;

const OPERATOR_OPTIONS = [
	{ label: "ایرانسل", value: "IRANCELL" },
	{ label: "همراه اول", value: "MCI" },
	{ label: "سایر", value: "OTHER" },
] as const;

const TRAFFIC_COMPANY_TYPE_OPTIONS = [
	{ label: "CP", value: "CP" },
	{ label: "IXP", value: "IXP" },
	{ label: "TCI", value: "TCI" },
	{ label: "PREMIUM", value: "PREMIUM" },
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
	setSelectedService,
	serviceOptions,
	companyOptions,
	isCompanyDisabled,
	companyPlaceholder,
	salesAgentOptions,
}: GetPerformanceColumnsArgs): ProColumns<PerformanceListRow>[] {
	console.warn(serviceOptions, "serrrrrrrrrrrrrrr");
	const serviceNameById = serviceOptions.reduce((acc, it) => {
		acc[String(it.value)] = String(it.label);
		return acc;
	}, {} as Record<string, string>);
	const companyNameById = companyOptions.reduce((acc, it) => {
		acc[String(it.value)] = String(it.label);
		return acc;
	}, {} as Record<string, string>);
	console.warn(companyOptions, "oppppppppppppppp1");
	console.warn(companyNameById, "oppppppppppppppp2");

	const serviceCode = (selectedServiceCode ?? "").trim().toLowerCase() as ServiceCode | "";

	const hasSelectedService = Boolean(serviceCode);
	const isOpenApi = serviceCode === "openapi";
	const isPsp = serviceCode === "psp";
	const isTraffic = serviceCode === "traffic";
	const isSms = serviceCode === "sms";
	const isSmsCommission = isSmsCommissionService(serviceCode);
	const isCommercial = serviceCode === "commercial";

	return [
		{
			dataIndex: "index",
			title: t("common.index"),
			valueType: "indexBorder",
			width: 80,
			hideInSearch: true,
		},
		{
			title: "سرویس",
			dataIndex: "service_name",
			search: false,
			width: 160,
			render: (_, r) => (r as any).service_name ?? serviceNameById[String((r as any).service)] ?? "-",
			// render: (_, r) => console.warn(r, "rrrrrrrrrrrr"),
			// render: (_, row) => row.service_name ?? "-",
		},
		{
			title: "سرویس",
			dataIndex: "service",
			hideInTable: true,
			valueType: "select",
			valueEnum: serviceOptions.reduce((acc, option) => {
				acc[String(option.value)] = option.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: {
				allowClear: true,
				placeholder: "سرویس را انتخاب کنید",
				onChange: (value: number | null) => {
					const numericId = value == null ? null : Number(value);
					const selected = serviceOptions.find(option => option.value === numericId);
					setSelectedService(numericId, selected?.code ?? null);
				},
			},
		},
		{
			title: "شرکت",
			dataIndex: "company_name",
			search: false,
			width: 220,
			// render: (_, row) => row.company_name ?? "-",
			render: (_, r) => (r as any).company_name ?? companyNameById[String((r as any).company)] ?? "-",

		},
		{
			title: "شرکت",
			dataIndex: "company",
			hideInTable: true,
			valueType: "select",
			valueEnum: companyOptions.reduce((acc, option) => {
				acc[String(option.value)] = option.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: {
				allowClear: true,
				disabled: isCompanyDisabled,
				placeholder: companyPlaceholder,
			},
		},
		{
			title: "جستجو",
			dataIndex: "search",
			hideInTable: true,
			hideInSearch: !hasSelectedService,
			valueType: "text",
		},
		{
			title: "سال",
			dataIndex: "sh_year",
			width: 100,
			render: (_, row) => row.sh_year ?? "-",
		},
		{
			title: "سال",
			dataIndex: "sh_year",
			hideInTable: true,
			hideInSearch: !hasSelectedService,
			valueType: "select",
			valueEnum: YEAR_OPTIONS.reduce((acc, option) => {
				acc[String(option.value)] = option.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: { allowClear: true, placeholder: "سال" },
		},
		{
			title: "ماه",
			dataIndex: "sh_month",
			width: 100,
			render: (_, row) => {
				const month = Number(row.sh_month);
				const found = MONTH_OPTIONS.find(option => option.value === month);
				return found?.label ?? row.sh_month ?? "-";
			},
		},
		{
			title: "ماه",
			dataIndex: "sh_month",
			hideInTable: true,
			hideInSearch: !hasSelectedService,
			valueType: "select",
			valueEnum: MONTH_OPTIONS.reduce((acc, option) => {
				acc[String(option.value)] = option.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: { allowClear: true, placeholder: "ماه" },
		},
		{
			title: "مرتب‌سازی",
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
		{
			title: "از تاریخ میلادی",
			dataIndex: "gr_month_start_after",
			hideInTable: true,
			hideInSearch: !hasSelectedService || isPsp,
			valueType: "date",
		},
		{
			title: "تا تاریخ میلادی",
			dataIndex: "gr_month_start_before",
			hideInTable: true,
			hideInSearch: !hasSelectedService || isPsp,
			valueType: "date",
		},
		{
			title: "مقدار",
			dataIndex: "value",
			width: 140,
			search: false,
			render: (_, row) => formatNumeric(row.value),
		},
		{
			title: "درآمد",
			dataIndex: "income",
			width: 140,
			search: false,
			render: (_, row) => formatNumeric(row.income),
		},
		{
			title: "نوع عملیات",
			dataIndex: "operation_type",
			width: 170,
			hideInSearch: !isOpenApi,
			valueType: "select",
			valueEnum: OPERATION_TYPE_OPTIONS.reduce((acc, option) => {
				acc[option] = option;
				return acc;
			}, {} as Record<string, string>),
			render: (_, row) => row.operation_type ?? "-",
		},
		{
			title: "اپراتور",
			dataIndex: "operator",
			width: 120,
			hideInSearch: !(isSms || isSmsCommission),
			valueType: "select",
			valueEnum: OPERATOR_OPTIONS.reduce((acc, option) => {
				acc[option.value] = option.label;
				return acc;
			}, {} as Record<string, string>),
			render: (_, row) => row.operator ?? "-",
		},
		{
			title: "زبان",
			dataIndex: "language",
			width: 100,
			hideInSearch: !(isSms || isSmsCommission),
			valueType: "select",
			valueEnum: LANGUAGE_OPTIONS.reduce((acc, option) => {
				acc[option.value] = option.label;
				return acc;
			}, {} as Record<string, string>),
			render: (_, row) => {
				if (!row.language)
					return "-";
				return row.language === "FA" ? "فارسی" : row.language === "EN" ? "انگلیسی" : row.language;
			},
		},
		{
			title: "رسمی",
			dataIndex: "is_official",
			width: 100,
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
			title: "نماینده فروش",
			dataIndex: "sales_agent",
			width: 150,
			hideInSearch: !isSmsCommission,
			valueType: "select",
			valueEnum: salesAgentOptions.reduce((acc, option) => {
				acc[String(option.value)] = option.label;
				return acc;
			}, {} as Record<string, string>),
			render: (_, row) => row.sales_agent_name ?? row.sales_agent ?? "-",
		},
		{
			title: "نوع شرکت",
			dataIndex: "company_type",
			width: 120,
			hideInSearch: !isTraffic,
			valueType: "select",
			valueEnum: TRAFFIC_COMPANY_TYPE_OPTIONS.reduce((acc, option) => {
				acc[option.value] = option.label;
				return acc;
			}, {} as Record<string, string>),
			render: (_, row) => row.company_type ?? "-",
		},
		{
			title: "لوکیشن",
			dataIndex: "location",
			width: 140,
			hideInSearch: !isTraffic,
			valueType: "text",
			render: (_, row) => row.location ?? "-",
		},
		{
			title: "نام مشتری",
			dataIndex: "customer_name",
			width: 170,
			hideInSearch: !isCommercial,
			valueType: "text",
		},
		{
			title: "کد ملی مشتری",
			dataIndex: "customer_nic",
			width: 150,
			hideInSearch: !isCommercial,
			valueType: "text",
		},
		{
			title: "کد استان",
			dataIndex: "province_code",
			width: 130,
			hideInSearch: !isCommercial,
			valueType: "text",
		},
		{
			title: "نوع سرویس تجاری",
			dataIndex: "service_type",
			width: 140,
			hideInSearch: !isCommercial,
			valueType: "text",
		},

		{
			title: "دریافتی",
			dataIndex: "value_receive",
			width: 140,
			search: false,
			render: (_, row) => formatNumeric(row.value_receive),
		},

		{
			title: "هزینه",
			dataIndex: "expense",
			width: 140,
			search: false,
			render: (_, row) => formatNumeric(row.expense),
		},
		{
			title: "سود",
			dataIndex: "profit",
			width: 140,
			search: false,
			render: (_, row) => formatNumeric(row.profit),
		},
	];
}
