import type {
	ContractApprovalHistoryEntryDto,
	ContractApprovalHistorySubjectDto,
} from "../../../api/contracts.api";

import CheckVerifiedIcon from "#src/assets/svg/contract-history/check-verified.svg?react";
import CircleStatusIcon from "#src/assets/svg/contract-history/circle.svg?react";
import DangerIcon from "#src/assets/svg/contract-history/danger.svg?react";
import {
	ClockCircleOutlined,
	DownOutlined,
	QuestionCircleOutlined,
	UpOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { Badge, Collapse, Empty, Space, Tag, Timeline, Typography } from "antd";
import { useContractApprovalHistoryStyles } from "./contract-approval-history.styles";
import { formatHistoryDate } from "./contract-approval-history.utils";

function getFieldLabel(fieldName: string) {
	switch (fieldName) {
		case "is_business_approved":
			return "تأیید تجاری";
		case "is_signed":
			return "تأیید اداره قراردادها";
		default:
			return fieldName;
	}
}

function getValuePresentation(entry: ContractApprovalHistoryEntryDto) {
	if (entry.new_value === true) {
		return {
			color: "success" as const,
			cssColor: "var(--ant-color-success)",
			icon: entry.field_name === "is_signed" ? <CheckVerifiedIcon /> : <CircleStatusIcon />,
			label: "تأیید شده",
		};
	}

	if (entry.new_value === false) {
		return {
			color: "error" as const,
			cssColor: "var(--ant-color-error)",
			icon: entry.field_name === "is_signed" ? <CircleStatusIcon /> : <DangerIcon />,
			label: "رد شده",
		};
	}

	return {
		color: "default" as const,
		cssColor: "var(--ant-color-text-tertiary)",
		icon: <QuestionCircleOutlined />,
		label: "نامشخص",
	};
}

function getHistoryDescription(entry: ContractApprovalHistoryEntryDto) {
	if (entry.comment?.trim())
		return entry.comment.trim();
	if (entry.reason === "manual_change")
		return "تغییر دستی";
	return entry.reason?.trim() || "بدون توضیحات";
}

function HistoryEntry({ entry }: { entry: ContractApprovalHistoryEntryDto }) {
	const value = getValuePresentation(entry);
	const description = getHistoryDescription(entry);

	return (
		<div className="flex flex-col gap-1 pb-1">
			<Space size="small" wrap>
				<Typography.Text strong>{getFieldLabel(entry.field_name)}</Typography.Text>
				<Tag bordered={false} color={value.color}>{value.label}</Tag>
			</Space>
			<Space size="middle" wrap>
				<Typography.Text type="secondary">
					<UserOutlined />
					{" "}
					توسط
					{" "}
					{entry.changed_by?.name || "نامشخص"}
				</Typography.Text>
				<Typography.Text type="secondary">
					<ClockCircleOutlined />
					{" "}
					{formatHistoryDate(entry.changed_at)}
				</Typography.Text>
			</Space>
			<Typography.Text type="secondary" ellipsis={{ tooltip: description }}>
				{description}
			</Typography.Text>
		</div>
	);
}

export function ContractApprovalHistory({ subject }: { subject: ContractApprovalHistorySubjectDto }) {
	const classes = useContractApprovalHistoryStyles();
	const history = Array.isArray(subject.sign_approval_history) ? subject.sign_approval_history : [];

	return (
		<Collapse
			className={classes.historyCollapse}
			size="small"
			expandIconPosition="end"
			expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <UpOutlined />}
			items={[
				{
					key: String(subject.id),
					label: (
						<div className={classes.collapseLabel}>
							<span>تاریخچه تغییرات</span>
							<Badge count={history.length} showZero color="var(--ant-color-primary)" />
						</div>
					),
					children: history.length === 0
						? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="تاریخچه‌ای ثبت نشده است" />
						: (
							<Timeline
								className={classes.timeline}
								items={history.map((entry, index) => {
									const presentation = getValuePresentation(entry);
									return {
										color: presentation.cssColor,
										children: <HistoryEntry entry={entry} />,
										dot: <span style={{ color: presentation.cssColor }}>{presentation.icon}</span>,
										key: `${entry.field_name}-${entry.changed_at}-${index}`,
									};
								})}
							/>
						),
				},
			]}
		/>
	);
}
