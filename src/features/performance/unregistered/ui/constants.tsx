import type { CompanyTypeOption } from "#src/api/user/types";
import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { PerformanceListRow } from "../model/performance.list.types";
import { pickCompanyTypeToken } from "#src/features/performance/shared/model/performance.helpers";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { Tag } from "antd";
import {
	isCompanyTypeColumnService,
	isCompanyTypeFilterService,
} from "../model/unregistered-performance.model";

export interface GetPerformanceColumnsArgs {
	t: TFunction<"translation", undefined>
	selectedServiceCodes: string[]
	permittedCompanyTypeOptions: CompanyTypeOption[]
	setSelectedServices: (serviceIds: number[]) => void
	setSelectedCompanyType: (companyType: string | undefined) => void
	serviceOptions: Array<{ label: string, value: number, code: string }>
	companyOptions: Array<{ label: string, value: number }>
	isCompanyDisabled: boolean
	companyPlaceholder: string
	showCollocationMode: boolean
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
	selectedServiceCodes,
	permittedCompanyTypeOptions,
	setSelectedServices,
	setSelectedCompanyType,
	serviceOptions,
	companyOptions,
	isCompanyDisabled,
	companyPlaceholder,
	showCollocationMode,
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

	const hasCompanyTypeFilter = selectedServiceCodes.some(isCompanyTypeFilterService);
	const hasCompanyTypeColumn = selectedServiceCodes.some(isCompanyTypeColumnService);

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
			sorter: { multiple: 4 },
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
				onChange: (value: Array<string | number> | null) => {
					setSelectedServices(
						(value ?? [])
							.map(item => Number(item))
							.filter(item => Number.isInteger(item) && item > 0),
					);
				},
			},
		},
		{
			title: t("performance.columns.company"),
			dataIndex: "company_name",
			search: false,
			width: 220,
			sorter: { multiple: 3 },
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
			title: t("performance.columns.companyType"),
			dataIndex: "company_type",
			width: 120,
			search: false,
			hideInTable: !hasCompanyTypeColumn,
			render: (_, row) => (
				isCompanyTypeColumnService(String((row as any).service_code ?? ""))
					? getCompanyTypeDisplay(row.company_type, companyTypeLabelByKey)
					: "-"
			),
		},
		{
			title: t("performance.columns.companyType"),
			dataIndex: "company_type",
			key: "company_type_filter",
			hideInTable: true,
			hideInSearch: !hasCompanyTypeFilter,
			valueType: "select",
			valueEnum: permittedCompanyTypeOptions.reduce((acc, option) => {
				acc[option.key] = option.value;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: {
				onChange: (value: string | undefined) => setSelectedCompanyType(value),
			},
		},
		{
			title: t("performance.columns.contractType"),
			dataIndex: "is_official",
			width: 120,
			search: false,
			hideInTable: !selectedServiceCodes.some(isCompanyTypeFilterService),
			render: (_, row) => (
				typeof row.is_official === "boolean"
					? (
						<Tag color={row.is_official ? "success" : "error"}>
							{t(row.is_official ? "performance.contractType.official" : "performance.contractType.unofficial")}
						</Tag>
					)
					: "-"
			),
		},
		{
			title: t("performance.columns.collocationMode"),
			dataIndex: "collocation_mode",
			width: 100,
			search: false,
			hideInTable: !showCollocationMode,
			render: (_, row) => (
				pickCompanyTypeToken(row.company_type) === "COLLOCATION" && row.collocation_mode
					? <Tag>{String(row.collocation_mode).toUpperCase()}</Tag>
					: "-"
			),
		},
		{
			title: t("performance.columns.year"),
			dataIndex: "sh_year",
			hideInSearch: true,
			width: 100,
			sorter: { multiple: 2 },
			render: (_, row) => row.sh_year ?? "-",
		},
		{
			title: t("performance.columns.month"),
			dataIndex: "sh_month",
			width: 100,
			hideInSearch: true,
			sorter: { multiple: 1 },
			render: (_, row) => {
				const month = Number(row.sh_month);
				const found = MONTH_OPTIONS.find(option => option.value === month);
				return found?.label ?? row.sh_month ?? "-";
			},
		},
	];
}
