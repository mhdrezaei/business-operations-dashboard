import type { ProColumns } from "@ant-design/pro-components";
import type { ShareholderDto } from "../model/shareholders.types";

export const SHAREHOLDER_ORDERING_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "نام (صعودی)", value: "full_name" },
	{ label: "نام (نزولی)", value: "-full_name" },
	{ label: "درصد مالکیت (صعودی)", value: "ownership_percent" },
	{ label: "درصد مالکیت (نزولی)", value: "-ownership_percent" },
	{ label: "شناسه (صعودی)", value: "id" },
	{ label: "شناسه (نزولی)", value: "-id" },
];

export function getShareholderColumns(): ProColumns<ShareholderDto>[] {
	return [
		{
			dataIndex: "index",
			title: "ردیف",
			valueType: "indexBorder",
			width: 80,
		},
		{
			title: "نام سهامدار",
			dataIndex: "full_name",
			ellipsis: true,
			search: false,
		},
		{
			title: "شناسه ملی",
			dataIndex: "national_id",
			ellipsis: true,
			search: false,
			width: 160,
		},
		{
			title: "درصد مالکیت",
			dataIndex: "ownership_percent",
			search: false,
			width: 140,
		},
		{
			title: "یادداشت",
			dataIndex: "note",
			ellipsis: true,
			search: false,
		},

		// فیلترها (مطابق swagger: company/page/search/ordering) — company از context میاد، پس فقط search/ordering
		{
			title: "جستجو",
			dataIndex: "search",
			hideInTable: true,
			valueType: "text",
			fieldProps: { allowClear: true, placeholder: "جستجو بر اساس نام و شناسه ملی" },
		},
		{
			title: "مرتب‌سازی",
			dataIndex: "ordering",
			hideInTable: true,
			valueType: "select",
			valueEnum: SHAREHOLDER_ORDERING_OPTIONS.reduce((acc, it) => {
				acc[it.value] = it.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: { allowClear: true, placeholder: "انتخاب کنید" },
		},
	];
}
