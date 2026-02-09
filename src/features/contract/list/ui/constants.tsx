import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { ContractListItemType } from "../model/contracts.list.types";
import { Tag } from "antd";

const TRAFFIC_COMPANY_TYPE_OPTIONS = [
	{ label: "CP", value: "CP" },
	{ label: "IXP", value: "IXP" },
	{ label: "TCI", value: "TCI" },
	{ label: "PREMIUM", value: "PREMIUM" },
] as const;

type TrafficCompanyType = typeof TRAFFIC_COMPANY_TYPE_OPTIONS[number]["value"];

export interface GetContractColumnsArgs {
	t: TFunction<"translation", undefined>

	selectedServiceId: number | null
	setSelectedServiceId: (v: number | null) => void

	isTrafficService: boolean
	isSmsService: boolean

	selectedTrafficCompanyType: TrafficCompanyType | null
	setSelectedTrafficCompanyType: (v: TrafficCompanyType | null) => void

	serviceOptions: Array<{ label: any, value: any }>
	companyOptions: Array<{ label: any, value: any }>

	isCompanyDisabled: boolean
	companyPlaceholder: string

	/** فقط وابسته‌ها را پاک کن (نه کل فرم) */
	onServiceFilterChange?: () => void
}

const ORDERING_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "نام شرکت (صعودی)", value: "company_name" },
	{ label: "نام شرکت (نزولی)", value: "-company_name" },
	{ label: "نام سرویس (صعودی)", value: "service_name" },
	{ label: "نام سرویس (نزولی)", value: "-service_name" },
	{ label: "تعداد الحاقیه (صعودی)", value: "addenda_count" },
	{ label: "تعداد الحاقیه (نزولی)", value: "-addenda_count" },
	{ label: "نوع شرکت ترافیک (صعودی)", value: "traffic_company_type" },
	{ label: "نوع شرکت ترافیک (نزولی)", value: "-traffic_company_type" },
	{ label: "رسمی بودن ترافیک (صعودی)", value: "traffic_is_official" },
	{ label: "رسمی بودن ترافیک (نزولی)", value: "-traffic_is_official" },
	{ label: "تاریخ شروع (صعودی)", value: "start_date" },
	{ label: "تاریخ شروع (نزولی)", value: "-start_date" },
	{ label: "تاریخ پایان (صعودی)", value: "end_date_exclusive" },
	{ label: "تاریخ پایان (نزولی)", value: "-end_date_exclusive" },
	{ label: "شناسه قرارداد (صعودی)", value: "id" },
	{ label: "شناسه قرارداد (نزولی)", value: "-id" },
	{ label: "شناسه سرویس (صعودی)", value: "service_id" },
	{ label: "شناسه سرویس (نزولی)", value: "-service_id" },
	{ label: "شناسه شرکت (صعودی)", value: "company_id" },
	{ label: "شناسه شرکت (نزولی)", value: "-company_id" },
];

export function getContractColumns({
	t,
	// selectedServiceId,
	setSelectedServiceId,
	isTrafficService,
	isSmsService,
	selectedTrafficCompanyType,
	setSelectedTrafficCompanyType,
	serviceOptions,
	companyOptions,
	isCompanyDisabled,
	companyPlaceholder,
	onServiceFilterChange,
}: GetContractColumnsArgs): ProColumns<ContractListItemType>[] {
	return [
		{
			dataIndex: "index",
			title: t("common.index"),
			valueType: "indexBorder",
			width: 80,
		},

		{
			title: t("contract.tableTitle.servicetype"),
			dataIndex: "service_name",
			ellipsis: true,
			width: 160,
			search: false,
		},

		{
			title: t("contract.tableTitle.servicetype"),
			dataIndex: "service_id",
			valueType: "select",
			hideInTable: true,
			valueEnum: serviceOptions.reduce((acc, it) => {
				acc[String(it.value)] = it.label;
				return acc;
			}, {} as Record<string, any>),
			fieldProps: {
				allowClear: true,
				placeholder: "سرویس را انتخاب کنید",
				onChange: (v: any) => {
					const nv = v == null ? null : Number(v);
					setSelectedServiceId(nv);

					// مثل فرم create
					setSelectedTrafficCompanyType(null);

					// ✅ فقط وابسته‌ها را پاک کن (نه کل فرم)
					onServiceFilterChange?.();
				},
			},
		},

		{
			title: t("contract.tableTitle.trafficCompanyType"),
			dataIndex: "company_type",
			valueType: "select",
			width: 150,
			hideInSearch: !isTrafficService,
			valueEnum: TRAFFIC_COMPANY_TYPE_OPTIONS.reduce((acc, it) => {
				acc[it.value] = it.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: {
				allowClear: true,
				placeholder: "نوع شرکت ترافیک را انتخاب کنید",
				onChange: (v: any) => setSelectedTrafficCompanyType((v ?? null) as any),
			},
		},

		{
			title: t("contract.formLabel.companyName"),
			dataIndex: "company_name",
			ellipsis: true,
			width: 220,
			search: false,
		},

		{
			title: t("contract.formLabel.companyName"),
			dataIndex: "company_id",
			valueType: "select",
			hideInTable: true,
			hideInSearch: isTrafficService ? !selectedTrafficCompanyType : false,
			valueEnum: companyOptions.reduce((acc, it) => {
				acc[String(it.value)] = it.label;
				return acc;
			}, {} as Record<string, any>),
			fieldProps: {
				allowClear: true,
				disabled: isCompanyDisabled,
				placeholder: companyPlaceholder,
			},
		},

		{
			title: t("common.search"),
			dataIndex: "search",
			hideInTable: true,
			valueType: "text",
			fieldProps: { allowClear: true, placeholder: t("contract.tableTitle.searchTerm") },
		},

		{
			title: t("contract.tableTitle.sort"),
			dataIndex: "ordering",
			hideInTable: true,
			valueType: "select",
			valueEnum: ORDERING_OPTIONS.reduce((acc, it) => {
				acc[it.value] = it.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: { allowClear: true, placeholder: t("contract.tableTitle.orderBy") },
		},

		{
			title: "sms_party",
			dataIndex: "sms_party",
			valueType: "select",
			hideInTable: true,
			hideInSearch: !isSmsService,
			valueEnum: {
				vendor: { text: "vendor" },
				client: { text: "client" },
			},
			fieldProps: { allowClear: true, placeholder: "sms_party" },
		},

		{
			title: t("contract.tableTitle.addendaCount"),
			dataIndex: "addenda_count",
			width: 120,
			search: false,
		},

		{
			title: t("contract.tableTitle.isOfficial"),
			dataIndex: "is_official",
			valueType: "select",
			width: 130,
			hideInSearch: !isTrafficService,
			valueEnum: {
				true: { text: t("common.yes") },
				false: { text: t("common.no") },
			},
			render: (_, r) => {
				const v = (r as any).traffic_is_official ?? (r as any).is_official;
				if (v == null)
					return "-";
				return <Tag>{v ? t("common.yes") : t("common.no")}</Tag>;
			},
		},

		{
			title: t("contract.tableTitle.startDate"),
			dataIndex: "start_date",
			valueType: "date",
			width: 140,
			search: false,
		},
		{
			title: t("contract.tableTitle.endDate"),
			dataIndex: "end_date",
			valueType: "date",
			width: 140,
			search: false,
		},
	];
}
