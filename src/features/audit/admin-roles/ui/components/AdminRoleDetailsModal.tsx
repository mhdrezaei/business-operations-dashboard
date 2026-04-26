import type { AdminRoleDto } from "../../model/admin-roles.types";

import { Descriptions, Empty, Modal, Space, Tag, Typography } from "antd";
import React from "react";

import {
	formatAdminRoleCreatedAt,
	formatAdminRoleUserName,
	getAdminRoleScopeLabel,
	getAdminRoleServiceLabels,
} from "../../model/admin-roles.utils";

interface Props {
	open: boolean
	role: AdminRoleDto | null
	serviceNameById: Map<number, string>
	onClose: () => void
}

function renderTagList(items: string[]) {
	if (items.length === 0) {
		return "-";
	}

	return (
		<Space size={[4, 4]} wrap>
			{items.map(item => (
				<Tag key={item}>{item}</Tag>
			))}
		</Space>
	);
}

export function AdminRoleDetailsModal({ open, role, serviceNameById, onClose }: Props) {
	const assignedUsers = role?.assigned_users.map(formatAdminRoleUserName) ?? [];
	const allowedServices = role
		? getAdminRoleServiceLabels(role.allowed_service_ids, serviceNameById)
		: [];

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title="جزئیات نقش"
			footer={null}
			width={840}
			destroyOnClose
		>
			{!role
				? <Empty description="نقشی برای نمایش انتخاب نشده است." />
				: (
					<Space direction="vertical" size={16} className="w-full">
						<div>
							<Typography.Title level={4} className="mb-2">
								{role.name}
							</Typography.Title>
							<Typography.Text type="secondary">
								{`شناسه نقش: ${role.id}`}
							</Typography.Text>
						</div>

						<Descriptions bordered size="small" column={2}>
							<Descriptions.Item label="دامنه نقش">
								<Tag>{getAdminRoleScopeLabel(role.scope)}</Tag>
							</Descriptions.Item>
							<Descriptions.Item label="نوع نقش">
								<Tag color={role.is_system ? "gold" : "blue"}>
									{role.is_system ? "سیستمی" : "عادی"}
								</Tag>
							</Descriptions.Item>
							<Descriptions.Item label="ایجادکننده">
								{formatAdminRoleUserName(role.created_by_user)}
							</Descriptions.Item>
							<Descriptions.Item label="ادمین سرویس">
								{formatAdminRoleUserName(role.owner_admin)}
							</Descriptions.Item>
							<Descriptions.Item label="تعداد کاربران منتسب">
								{role.assigned_user_count}
							</Descriptions.Item>
							<Descriptions.Item label="زمان ایجاد">
								{formatAdminRoleCreatedAt(role.created_at)}
							</Descriptions.Item>
							<Descriptions.Item label="توضیحات" span={2}>
								{role.description?.trim() || "برای این نقش توضیحی ثبت نشده است."}
							</Descriptions.Item>
							<Descriptions.Item label="سرویس‌های مجاز" span={2}>
								{renderTagList(allowedServices)}
							</Descriptions.Item>
							<Descriptions.Item label="کاربران منتسب" span={2}>
								{renderTagList(assignedUsers)}
							</Descriptions.Item>
						</Descriptions>
					</Space>
				)}
		</Modal>
	);
}
