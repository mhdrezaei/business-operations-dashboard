import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { PerformanceListRow } from "../model/performance.list.types";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";

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
	const serviceNameById = serviceOptions.reduce((acc, it) => {
		acc[String(it.value)] = String(it.label);
		return acc;
	}, {} as Record<string, string>);
	const companyNameById = companyOptions.reduce((acc, it) => {
		acc[String(it.value)] = String(it.label);
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

	const TRAFFIC_COMPANY_TYPE_OPTIONS = [
		{ label: "CP", value: "CP" },
		{ label: "IXP", value: "IXP" },
		{ label: "TCI", value: "TCI" },
		{ label: "PREMIUM", value: "PREMIUM" },
	] as const;

	const hasSelectedService = Boolean(serviceCode);

	const isTraffic = serviceCode === "traffic";
	const isSmsCommission = isSmsCommissionService(serviceCode);

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
				disabled: isCompanyDisabled,
				placeholder: companyPlaceholder,
			},
		},
		{
			title: t("performance.columns.year"),
			dataIndex: "sh_year",
			hideInSearch: true,
			width: 100,
			render: (_, row) => row.sh_year ?? "-",
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

		{
			title: t("performance.columns.salesAgent"),
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
			title: t("performance.columns.companyType"),
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

	];
}
