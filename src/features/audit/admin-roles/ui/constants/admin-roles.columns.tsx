import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { AdminRoleDto } from "../../model/admin-roles.types";

import { Space, Tag, Tooltip } from "antd";
import {
	formatAdminRoleCreatedAt,
	formatAdminRoleUserName,
	getAdminRoleScopeLabel,
	getAdminRoleServiceLabels,
} from "../../model/admin-roles.utils";

const ORDERING_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "شناسه (صعودی)", value: "id" },
	{ label: "شناسه (نزولی)", value: "-id" },
	{ label: "نام نقش (صعودی)", value: "name" },
	{ label: "نام نقش (نزولی)", value: "-name" },
	{ label: "دامنه (صعودی)", value: "scope" },
	{ label: "دامنه (نزولی)", value: "-scope" },
	{ label: "تعداد کاربران (صعودی)", value: "assigned_user_count" },
	{ label: "تعداد کاربران (نزولی)", value: "-assigned_user_count" },
	{ label: "زمان ایجاد (صعودی)", value: "created_at" },
	{ label: "زمان ایجاد (نزولی)", value: "-created_at" },
];

function renderServiceSummary(serviceIds: number[], serviceNameById: Map<number, string>) {
	if (serviceIds.length === 0) {
		return "-";
	}

	const labels = getAdminRoleServiceLabels(serviceIds, serviceNameById);
	const previewLabels = labels.slice(0, 2);

	return (
		<Tooltip title={labels.join("، ")}>
			<Space size={[4, 4]} wrap>
				{previewLabels.map(label => (
					<Tag key={label}>{label}</Tag>
				))}
				{labels.length > previewLabels.length
					? <Tag>{`+${labels.length - previewLabels.length}`}</Tag>
					: null}
			</Space>
		</Tooltip>
	);
}

export function getAdminRolesColumns({
	t,
	serviceNameById,
}: {
	t: TFunction<"translation", undefined>
	serviceNameById: Map<number, string>
}): ProColumns<AdminRoleDto>[] {
	return [
		{
			dataIndex: "index",
			title: t("common.index"),
			valueType: "indexBorder",
			width: 80,
		},
		{
			title: "شناسه",
			dataIndex: "id",
			width: 90,
			search: false,
		},
		{
			title: "نام نقش",
			dataIndex: "name",
			width: 220,
			ellipsis: true,
		},
		{
			title: "توضیحات",
			dataIndex: "description",
			width: 260,
			search: false,
			hideInTable: true,
			ellipsis: true,
			render: (_, record) => record.description?.trim() || "-",
		},
		{
			title: "دامنه",
			dataIndex: "scope",
			width: 140,
			search: false,
			render: (_, record) => <Tag>{getAdminRoleScopeLabel(record.scope)}</Tag>,
		},
		{
			title: "ادمین سرویس",
			dataIndex: "owner_admin",
			width: 180,
			search: false,
			render: (_, record) => formatAdminRoleUserName(record.owner_admin),
		},
		{
			title: "ایجادکننده",
			dataIndex: "created_by_user",
			width: 180,
			search: false,
			render: (_, record) => formatAdminRoleUserName(record.created_by_user),
		},
		{
			title: "تعداد کاربران",
			dataIndex: "assigned_user_count",
			width: 120,
			align: "center",
			search: false,
		},
		{
			title: "سرویس‌های مجاز",
			dataIndex: "allowed_service_ids",
			width: 260,
			search: false,
			render: (_, record) => renderServiceSummary(record.allowed_service_ids, serviceNameById),
		},
		{
			title: "نوع نقش",
			dataIndex: "is_system",
			width: 120,
			search: false,
			render: (_, record) => (
				<Tag color={record.is_system ? "gold" : "blue"}>
					{record.is_system ? "سیستمی" : "عادی"}
				</Tag>
			),
		},
		{
			title: "زمان ایجاد",
			dataIndex: "created_at",
			width: 180,
			search: false,
			render: (_, record) => formatAdminRoleCreatedAt(record.created_at),
		},
		{
			title: "جستجو",
			dataIndex: "search",
			hideInTable: true,
			valueType: "text",
			fieldProps: {
				allowClear: true,
				placeholder: "جستجو بر اساس نام یا توضیحات نقش...",
			},
		},
		{
			title: "مرتب‌سازی",
			dataIndex: "ordering",
			hideInTable: true,
			valueType: "select",
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
