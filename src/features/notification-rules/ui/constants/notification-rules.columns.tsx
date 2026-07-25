import type { ProColumns } from "@ant-design/pro-components";
import type { NotificationRuleDto } from "../../model/notification-rules.types";
import { Space, Tag, Tooltip } from "antd";
import {
	formatRuleRecipients,
	formatRuleServiceNames,
	getRuleCodeLabel,
	getRuleStatusLabel,
} from "../../model/notification-rules.utils";

const ORDERING_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "شناسه (صعودی)", value: "id" },
	{ label: "شناسه (نزولی)", value: "-id" },
	{ label: "نام (صعودی)", value: "name" },
	{ label: "نام (نزولی)", value: "-name" },
	{ label: "کد (صعودی)", value: "code" },
	{ label: "کد (نزولی)", value: "-code" },
];

function getOrderingValueEnum(): Record<string, string> {
	return ORDERING_OPTIONS.reduce((acc, item) => {
		acc[item.value] = item.label;
		return acc;
	}, {} as Record<string, string>);
}

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

export function getNotificationRulesColumns({ userNameById, roleNameById }: {
	userNameById: Map<number, string>
	roleNameById: Map<number, string>
}): ProColumns<NotificationRuleDto>[] {
	return [
		{ title: "نام", dataIndex: "name", width: 220, ellipsis: true },
		{ title: "کد", dataIndex: "code", width: 210, render: (_, record) => <Tooltip title={getRuleCodeLabel(record.code)}><Tag>{record.code}</Tag></Tooltip> },
		{ title: "فعال", dataIndex: "is_active", width: 100, valueType: "select", valueEnum: { true: "فعال", false: "غیرفعال" }, render: (_, record) => <Tag color={record.is_active ? "success" : "default"}>{getRuleStatusLabel(record.is_active)}</Tag> },
		{ title: "گلوبال", dataIndex: "is_global", width: 100, search: false, render: (_, record) => record.is_global ? "بله" : "خیر" },
		{ title: "حذف‌شده‌ها", dataIndex: "is_deleted", width: 120, search: false, render: (_, record) => record.is_deleted ? "بله" : "خیر" },
		{ title: "سرویس‌ها", dataIndex: "service_names", width: 220, search: false, render: (_, record) => renderServiceNames(record.service_names) },
		{ title: "نوع شرکت ترافیک", dataIndex: "traffic_company_type", width: 180, search: false, render: (_, record) => record.traffic_company_type ?? "-" },
		{ title: "روزها", dataIndex: "days_before_end", width: 140, search: false, render: (_, record) => record.days_before_end.join("، ") },
		{ title: "گیرنده‌ها", dataIndex: "recipients", width: 300, search: false, ellipsis: true, render: (_, record) => <Tooltip title={formatRuleRecipients(record.recipients, userNameById, roleNameById)}><span>{formatRuleRecipients(record.recipients, userNameById, roleNameById)}</span></Tooltip> },
		{ title: "جستجو", dataIndex: "search", hideInTable: true, valueType: "text", fieldProps: { allowClear: true, placeholder: "جستجو بر اساس نام یا کد..." } },
		{ title: "کد", dataIndex: "code", hideInTable: true, valueType: "select", valueEnum: { CONTRACT_EXPIRY: "CONTRACT_EXPIRY", CONTRACT_EXPIRY_SMS: "CONTRACT_EXPIRY_SMS" }, fieldProps: { allowClear: true } },
		{ title: "مرتب‌سازی", dataIndex: "ordering", hideInTable: true, valueType: "select", valueEnum: getOrderingValueEnum(), fieldProps: { allowClear: true, placeholder: "مرتب‌سازی..." } },
	];
}
