import type { SignFlowListItem } from "#src/features/contract/api/contracts.api";
import type { ProColumns, ProFormInstance } from "@ant-design/pro-components";
import { EyeOutlined } from "@ant-design/icons";
import { Button, Tag } from "antd";

import React from "react";

export const SIGN_FLOW_STATE_MAP: Record<string, { label: string, color: string }> = {
	in_progress: { label: "در حال بررسی", color: "blue" },
	approved: { label: "تایید شده", color: "success" },
	rejected: { label: "رد شده", color: "error" },
	cancelled: { label: "لغو شده", color: "default" },
	revoked: { label: "ابطال شده", color: "warning" },
};

export const RECORD_TYPE_MAP: Record<string, string> = {
	contract: "قرارداد پایه",
	addendum: "الحاقیه",
};

export function getSignFlowColumns(serviceOptions: Array<{ label: any, value: any }>, formRef: React.MutableRefObject<ProFormInstance | undefined>, onView: (id: number) => void): ProColumns<SignFlowListItem>[] {
	return [
		{
			title: "نمایش",
			dataIndex: "mine",
			hideInTable: true,
			valueType: "select",
			fieldProps: {
				placeholder: "همه گردش‌ها",
				options: [
					{ label: "همه گردش‌ها", value: "" },
					{ label: "ایجاد شده توسط من", value: "created" },
					{ label: "ارجاع شده به من", value: "assigned" },
				],
				onChange: () => formRef?.current?.submit(),
			},
		},
		{
			title: "سرویس",
			dataIndex: "service",
			valueType: "select",
			fieldProps: {
				placeholder: "همه سرویس‌ها",
				options: serviceOptions,
				onChange: () => formRef?.current?.submit(),
			},
			render: (_, record) => record.service_name || "-",
		},
		{
			title: "نوع سند",
			dataIndex: "record_type",
			valueType: "select",
			fieldProps: {
				placeholder: "قرارداد و الحاقیه",
				options: [
					{ label: "قرارداد و الحاقیه", value: "" },
					...Object.entries(RECORD_TYPE_MAP).map(([key, val]) => ({ label: val, value: key })),
				],
				onChange: () => formRef?.current?.submit(),
			},
			render: (_, record) => {
				const r = RECORD_TYPE_MAP[record.record_type];
				return r || record.record_type;
			},
		},
		{
			title: "شماره قرارداد",
			dataIndex: "contract_number",
			search: false,
			render: (_, record) => record.contract_number || "-",
		},
		{
			title: "نام شرکت",
			dataIndex: "company_name",
			search: false,
		},
		{
			title: "مرحله فعلی",
			dataIndex: "current_step_name",
			search: false,
			render: (_, record) => record.current_step_name ? `${record.current_step_name} (${record.current_step_order}/${record.total_steps})` : "-",
		},
		{
			title: "توسط",
			dataIndex: "created_by_username",
			search: false,
		},
		{
			title: "تاریخ شروع",
			dataIndex: "started_at",
			valueType: "dateTime",
			search: false,

		},
		{
			title: "تاریخ پایان",
			dataIndex: "finished_at",
			valueType: "dateTime",
			search: false,

			render: (_, record) => record.finished_at ? _ : "-",
		},
		{
			title: "دلیل لغو/رد",
			dataIndex: "cancel_reason",
			search: false,
			ellipsis: true,

			render: (_, record) => record.cancel_reason || "-",
		},
		{
			title: "وضعیت",
			dataIndex: "state",
			valueType: "select",
			fieldProps: {
				placeholder: "در حال بررسی",
				options: [
					{ label: "همه وضعیت‌ها", value: "" },
					...Object.entries(SIGN_FLOW_STATE_MAP).map(([key, val]) => ({ label: val.label, value: key })),
				],
				onChange: () => formRef?.current?.submit(),
			},
			render: (_, record) => {
				const s = SIGN_FLOW_STATE_MAP[record.state];
				if (!s)
					return record.state;
				return <Tag color={s.color}>{s.label}</Tag>;
			},
		},

		{
			title: "عملیات",
			dataIndex: "action",
			search: false,
			render: (_, record) => (
				<Button
					type="text"
					icon={<EyeOutlined />}
					onClick={() => onView(record.id)}
				/>
			),
		},
	];
}
