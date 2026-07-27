import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { TemplateListItemType } from "../model/templates.list.types";

export interface GetTemplateColumnsArgs {
	t: TFunction<"translation", undefined>
}

export function getTemplateColumns({ t }: GetTemplateColumnsArgs): ProColumns<TemplateListItemType>[] {
	return [
		{
			title: "نام قالب",
			dataIndex: "name",
			ellipsis: true,
			width: 200,
		},
		{
			title: "سرویس",
			dataIndex: "service_name",
			ellipsis: true,
			width: 150,
			search: false, // اگر سرچ روی این فیلد در API پیاده‌سازی نشده است
		},
		{
			title: "نوع سند",
			dataIndex: "document_kind",
			width: 120,
			search: false,
		},
		{
			title: "Variant",
			dataIndex: "variant",
			width: 120,
			search: false,
		},
		{
			title: "نوع شرکت",
			dataIndex: "company_type",
			width: 150,
			search: false,
		},
		{
			title: "ایجادکننده",
			dataIndex: "created_by_name",
			width: 150,
			search: false,
		},
		{
			title: "زمان ایجاد",
			dataIndex: "created_at",
			valueType: "dateTime",
			width: 150,
			search: false,
		},
		{
			title: "آخرین ویرایش‌کننده",
			dataIndex: "updated_by_name",
			width: 150,
			search: false,
		},
		{
			title: "آخرین ویرایش",
			dataIndex: "updated_at",
			valueType: "dateTime",
			width: 150,
			search: false,
		},
		// فیلد سرچ کلی برای ارسال به API طبق تصویر image_ca9207.png
		{
			title: t("common.search"),
			dataIndex: "search",
			hideInTable: true,
			valueType: "text",
			fieldProps: { allowClear: true, placeholder: "جستجو..." },
		},
	];
}
