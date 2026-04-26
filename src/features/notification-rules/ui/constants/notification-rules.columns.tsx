import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { NotificationRuleDto } from "../../model/notification-rules.types";
import { Space, Tag, Tooltip } from "antd";
import {
	formatRuleDate,
	formatRuleRecipients,
	formatRuleServiceNames,
	getRuleCodeLabel,
	getRuleStatusLabel,
	notificationRuleChannelLabels,
} from "../../model/notification-rules.utils";

const ORDERING_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "شناسه (صعودی)", value: "id" },
	{ label: "شناسه (نزولی)", value: "-id" },
	{ label: "نام (صعودی)", value: "name" },
	{ label: "نام (نزولی)", value: "-name" },
	{ label: "کد (صعودی)", value: "code" },
	{ label: "کد (نزولی)", value: "-code" },
	{ label: "زمان ایجاد (صعودی)", value: "created_at" },
	{ label: "زمان ایجاد (نزولی)", value: "-created_at" },
];

function renderServiceNames(serviceNames: string[]) {
	const text = formatRuleServiceNames(serviceNames);
	const preview = serviceNames.length ? serviceNames.slice(0, 2) : ["همه سرویس‌ها"];

	return (
		<Tooltip title={text}>
			<Space size={[4, 4]} wrap>
				{preview.map(label => <Tag key={label}>{label}</Tag>)}
				{serviceNames.length > preview.length ? <Tag>{`+${serviceNames.length - preview.length}`}</Tag> : null}
			</Space>
		</Tooltip>
	);
}

export function getNotificationRulesColumns({
	t,
	userNameById,
	roleNameById,
}: {
	t: TFunction<"translation", undefined>
	userNameById: Map<number, string>
	roleNameById: Map<number, string>
}): ProColumns<NotificationRuleDto>[] {
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
			title: "نام",
			dataIndex: "name",
			width: 240,
			ellipsis: true,
		},
		{
			title: "کد",
			dataIndex: "code",
			width: 210,
			render: (_, record) => (
				<Tooltip title={getRuleCodeLabel(record.code)}>
					<Tag>{record.code}</Tag>
				</Tooltip>
			),
		},
		{
			title: "فعال",
			dataIndex: "is_active",
			width: 110,
			valueType: "select",
			valueEnum: {
				true: "فعال",
				false: "غیرفعال",
			},
			render: (_, record) => (
				<Tag color={record.is_active ? "success" : "default"}>
					{getRuleStatusLabel(record.is_active)}
				</Tag>
			),
		},
		{
			title: "کانال",
			dataIndex: "channels",
			width: 140,
			search: false,
			render: (_, record) => (
				<Space size={[4, 4]} wrap>
					{record.channels.map(channel => (
						<Tag key={channel}>
							{notificationRuleChannelLabels[channel as "IN_APP" | "SMS"] ?? channel}
						</Tag>
					))}
				</Space>
			),
		},
		{
			title: "روزهای هشدار",
			dataIndex: "days_before_end",
			width: 190,
			search: false,
			render: (_, record) => record.days_before_end.join("، "),
		},
		{
			title: "سرویس‌ها",
			dataIndex: "service_names",
			width: 260,
			search: false,
			render: (_, record) => renderServiceNames(record.service_names),
		},
		{
			title: "گیرنده‌ها",
			dataIndex: "recipients",
			width: 300,
			search: false,
			ellipsis: true,
			render: (_, record) => (
				<Tooltip title={formatRuleRecipients(record.recipients, userNameById, roleNameById)}>
					<span>{formatRuleRecipients(record.recipients, userNameById, roleNameById)}</span>
				</Tooltip>
			),
		},
		{
			title: "به‌روزرسانی",
			dataIndex: "updated_at",
			width: 180,
			search: false,
			render: (_, record) => formatRuleDate(record.updated_at),
		},
		{
			title: "جستجو",
			dataIndex: "search",
			hideInTable: true,
			valueType: "text",
			fieldProps: {
				allowClear: true,
				placeholder: "جستجو بر اساس نام یا کد...",
			},
		},
		{
			title: "کد",
			dataIndex: "code",
			hideInTable: true,
			valueType: "select",
			valueEnum: {
				CONTRACT_EXPIRY: "CONTRACT_EXPIRY",
				CONTRACT_EXPIRY_SMS: "CONTRACT_EXPIRY_SMS",
			},
			fieldProps: {
				allowClear: true,
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
