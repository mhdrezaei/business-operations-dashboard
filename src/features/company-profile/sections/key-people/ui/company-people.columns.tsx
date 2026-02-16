// src/features/company-profile/sections/key-people/ui/company-people.columns.tsx
import type { ProColumns } from "@ant-design/pro-components";
import type { CompanyPersonDto } from "../model/company-people.types";
import { Tag } from "antd";
import { COMPANY_PEOPLE_ORDERING_OPTIONS, COMPANY_PERSON_ROLE_OPTIONS } from "../model/company-people.constants";

export function getCompanyPeopleColumns(): ProColumns<CompanyPersonDto>[] {
	return [
		{
			dataIndex: "index",
			title: "ردیف",
			valueType: "indexBorder",
			width: 80,
		},

		{
			title: "نام و نام خانوادگی",
			dataIndex: "full_name",
			ellipsis: true,
			width: 220,
			search: false,
		},
		{
			title: "نام و نام خانوادگی",
			dataIndex: "search",
			hideInTable: true,
			valueType: "text",
			fieldProps: { allowClear: true, placeholder: "جستجو بر اساس نام و نام خانوادگی" },
		},

		{
			title: "نقش",
			dataIndex: "role",
			width: 160,
			search: false,
			render: (_, r) => {
				const label = COMPANY_PERSON_ROLE_OPTIONS.find(x => x.value === r.role)?.label ?? r.role;
				return <Tag>{label}</Tag>;
			},
		},
		{
			title: "نقش",
			dataIndex: "role",
			hideInTable: true,
			valueType: "select",
			valueEnum: COMPANY_PERSON_ROLE_OPTIONS.reduce((acc, it) => {
				acc[it.value] = it.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: { allowClear: true, placeholder: "انتخاب کنید" },
		},

		{
			title: "صاحب امضا",
			dataIndex: "is_signatory",
			width: 120,
			search: false,
			render: (_, r) => (r.is_signatory ? <Tag>بله</Tag> : "-"),
		},
		{
			title: "فقط صاحب امضا",
			dataIndex: "is_signatory",
			hideInTable: true,
			valueType: "select",
			valueEnum: {
				true: { text: "بله" },
				false: { text: "خیر" },
			},
			fieldProps: { allowClear: true, placeholder: "انتخاب کنید" },
		},

		{
			title: "مرتب‌سازی",
			dataIndex: "ordering",
			hideInTable: true,
			valueType: "select",
			valueEnum: COMPANY_PEOPLE_ORDERING_OPTIONS.reduce((acc, it) => {
				acc[it.value] = it.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: { allowClear: true, placeholder: "انتخاب کنید" },
		},
	];
}
