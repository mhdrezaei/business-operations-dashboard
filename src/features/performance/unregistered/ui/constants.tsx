import type { CompanyTypeOption } from "#src/api/user/types";
import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { PerformanceListRow } from "../model/performance.list.types";
import { pickCompanyTypeToken } from "#src/features/performance/shared/model/performance.helpers";
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
	selectedServiceIds: number[]
	selectedServiceCode: string | null
	permittedCompanyTypeOptions: CompanyTypeOption[]
	setSelectedServices: (serviceIds: number[], serviceCode: string | null) => void
	serviceOptions: Array<{ label: string, value: number, code: string }>
	companyOptions: Array<{ label: string, value: number }>
	isCompanyDisabled: boolean
	companyPlaceholder: string
	salesAgentOptions: Array<{ label: string, value: number }>
}

function isSmsCommissionService(code: string | null | undefined) {
	return code === "sms-commission" || code === "sms_commission";
}

function serviceRequiresCompanyType(code: string | null | undefined) {
	const normalized = String(code ?? "").trim().toLowerCase();
	return normalized === "sms" || normalized === "psp" || normalized === "traffic";
}

function getCompanyTypeDisplay(companyType: unknown, companyTypeLabelByKey: Record<string, string>) {
	if (companyType && typeof companyType === "object" && !Array.isArray(companyType)) {
		const [firstValue] = Object.values(companyType as Record<string, unknown>)
			.map(value => String(value ?? "").trim())
			.filter(Boolean);
		if (firstValue)
			return firstValue;
	}

	const companyTypeKey = pickCompanyTypeToken(companyType);
	if (!companyTypeKey)
		return "-";
	return companyTypeLabelByKey[companyTypeKey] ?? companyTypeKey;
}

export function getPerformanceColumns({
	t,
	selectedServiceIds,
	// selectedServiceCode,
	permittedCompanyTypeOptions,
	setSelectedServices,
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
	const companyTypeLabelByKey = permittedCompanyTypeOptions.reduce((acc, item) => {
		acc[item.key] = item.value;
		return acc;
	}, {} as Record<string, string>);

	// const serviceCode = (selectedServiceCode ?? "").trim().toLowerCase() as ServiceCode | "";
	const selectedServiceCodes = Array.from(
		new Set(
			selectedServiceIds
				.map(serviceId => serviceOptions.find(option => option.value === serviceId)?.code ?? "")
				.map(code => String(code).trim().toLowerCase())
				.filter(Boolean),
		),
	) as ServiceCode[];

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

	const hasSelectedService = selectedServiceIds.length > 0;
	const showCompanyTypeSpecificFields = selectedServiceCodes.length > 0 && selectedServiceCodes.every(code => serviceRequiresCompanyType(code));
	const showSmsCommissionSpecificFields = selectedServiceCodes.length > 0 && selectedServiceCodes.every(code => isSmsCommissionService(code));

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
			dataIndex: "service_ids",
			hideInTable: true,
			valueType: "select",
			valueEnum: serviceOptions.reduce((acc, option) => {
				acc[String(option.value)] = option.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: {
				mode: "multiple",
				maxTagCount: "responsive",
				allowClear: true,
				options: serviceOptions.map(option => ({
					label: option.label,
					value: String(option.value),
				})),
				placeholder: t("performance.placeholders.selectService"),
				onChange: (value: Array<string | number> | string | number | null) => {
					const rawValues = Array.isArray(value)
						? value
						: value == null || value === ""
							? []
							: [value];
					const serviceIds = rawValues
						.map(item => Number(item))
						.filter(item => Number.isInteger(item) && item > 0);
					const selected = serviceIds.length === 1
						? serviceOptions.find(option => option.value === serviceIds[0])
						: null;
					setSelectedServices(serviceIds, selected?.code ?? null);
				},
				onClear: () => {
					setSelectedServices([], null);
				},
				onDeselect: (value: string | number) => {
					const removedServiceId = Number(value);
					const serviceIds = selectedServiceIds.filter(serviceId => serviceId !== removedServiceId);
					const selected = serviceIds.length === 1
						? serviceOptions.find(option => option.value === serviceIds[0])
						: null;
					setSelectedServices(serviceIds, selected?.code ?? null);
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
			dataIndex: "company_ids",
			hideInTable: true,
			valueType: "select",
			valueEnum: companyOptions.reduce((acc, option) => {
				acc[String(option.value)] = option.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: {
				mode: "multiple",
				maxTagCount: "responsive",
				allowClear: true,
				options: companyOptions.map(option => ({
					label: option.label,
					value: String(option.value),
				})),
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
			hideInTable: !showSmsCommissionSpecificFields,
			hideInSearch: !showSmsCommissionSpecificFields,
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
			hideInTable: !showCompanyTypeSpecificFields,
			hideInSearch: !showCompanyTypeSpecificFields,
			valueType: "select",
			valueEnum: permittedCompanyTypeOptions.reduce((acc, option) => {
				acc[option.key] = option.value;
				return acc;
			}, {} as Record<string, string>),
			render: (_, row) => getCompanyTypeDisplay(row.company_type, companyTypeLabelByKey),
		},

	];
}
