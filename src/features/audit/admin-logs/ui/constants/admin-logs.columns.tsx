import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { AuditLogDto } from "../../model/admin-logs.types";

import { Tag, Tooltip, Typography } from "antd";

import {
	formatAuditLogActor,
	formatAuditLogCreatedAt,
	getAuditLogMethodColor,
	getAuditLogStatusColor,
} from "../../model/admin-logs.utils";

const METHOD_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "GET", value: "GET" },
	{ label: "POST", value: "POST" },
	{ label: "PUT", value: "PUT" },
	{ label: "PATCH", value: "PATCH" },
	{ label: "DELETE", value: "DELETE" },
];

const ORDERING_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "زمان ایجاد (نزولی)", value: "-created_at" },
	{ label: "زمان ایجاد (صعودی)", value: "created_at" },
	{ label: "شناسه (نزولی)", value: "-id" },
	{ label: "شناسه (صعودی)", value: "id" },
	{ label: "وضعیت (نزولی)", value: "-status_code" },
	{ label: "وضعیت (صعودی)", value: "status_code" },
	{ label: "متد (نزولی)", value: "-method" },
	{ label: "متد (صعودی)", value: "method" },
];

function renderPath(path?: string | null) {
	const normalizedPath = path?.trim() || "-";

	return (
		<Tooltip title={normalizedPath}>
			<Typography.Text code ellipsis className="max-w-[360px]">
				{normalizedPath}
			</Typography.Text>
		</Tooltip>
	);
}

export function getAdminLogsColumns({
	t,
}: {
	t: TFunction<"translation", undefined>
}): ProColumns<AuditLogDto>[] {
	return [
		{
			dataIndex: "index",
			title: t("common.index"),
			valueType: "indexBorder",
			width: 80,
			search: false,
		},
		{
			title: "شناسه",
			dataIndex: "id",
			width: 90,
			search: false,
		},
		{
			title: "زمان",
			dataIndex: "created_at",
			width: 190,
			search: false,
			render: (_, record) => formatAuditLogCreatedAt(record.created_at),
		},
		{
			title: "کاربر",
			dataIndex: "actor_username",
			width: 170,
			ellipsis: true,
			search: false,
			render: (_, record) => formatAuditLogActor(record),
		},
		{
			title: "عملیات",
			dataIndex: "action",
			width: 130,
			search: false,
			render: (_, record) => <Tag>{record.action || "-"}</Tag>,
		},
		{
			title: "متد",
			dataIndex: "method",
			width: 100,
			align: "center",
			search: false,
			render: (_, record) => (
				<Tag color={getAuditLogMethodColor(record.method)}>
					{record.method || "-"}
				</Tag>
			),
		},
		{
			title: "وضعیت",
			dataIndex: "status_code",
			width: 100,
			align: "center",
			search: false,
			render: (_, record) => (
				<Tag color={getAuditLogStatusColor(record.status_code)}>
					{record.status_code ?? "-"}
				</Tag>
			),
		},
		{
			title: "مسیر",
			dataIndex: "path",
			width: 380,
			search: false,
			render: (_, record) => renderPath(record.path),
		},
		{
			title: "IP",
			dataIndex: "ip_address",
			width: 150,
			search: false,
			render: (_, record) => record.ip_address || "-",
		},
		{
			title: "برنامه",
			dataIndex: "app_label",
			width: 130,
			search: false,
			render: (_, record) => record.app_label || "-",
		},
		{
			title: "مدل",
			dataIndex: "model_name",
			width: 130,
			search: false,
			render: (_, record) => record.model_name || "-",
		},
		{
			title: "جستجو",
			dataIndex: "search",
			hideInTable: true,
			valueType: "text",
			fieldProps: {
				allowClear: true,
				placeholder: "جستجو بر اساس کاربر، مسیر، IP و ...",
			},
		},
		{
			title: "متد",
			dataIndex: "method",
			hideInTable: true,
			valueType: "select",
			valueEnum: METHOD_OPTIONS.reduce((acc, item) => {
				acc[item.value] = item.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: {
				allowClear: true,
				placeholder: "انتخاب متد",
			},
		},
		{
			title: "کد وضعیت",
			dataIndex: "status_code",
			hideInTable: true,
			valueType: "digit",
			fieldProps: {
				placeholder: "مثلا 200",
				min: 100,
				max: 599,
			},
		},
		{
			title: "مرتب‌سازی",
			dataIndex: "ordering",
			hideInTable: true,
			valueType: "select",
			initialValue: "-created_at",
			valueEnum: ORDERING_OPTIONS.reduce((acc, item) => {
				acc[item.value] = item.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: {
				allowClear: true,
				placeholder: "مرتب‌سازی...",
			},
		},
	];
}
