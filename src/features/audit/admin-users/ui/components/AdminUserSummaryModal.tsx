import type {
	AdminUserDto,
	AdminUserServiceAdminSummaryDto,
	AdminUserSummaryDeputyDto,
	AdminUserSummaryRoleDto,
} from "../../model/admin-users.types";
import { useQuery } from "@tanstack/react-query";
import { Descriptions, Empty, List, Modal, Space, Spin, Table, Tag, Typography } from "antd";
import { fetchAdminUserServiceAdminSummary } from "../../api/admin-users.api";

interface Props {
	open: boolean
	user: AdminUserDto | null
	onClose: () => void
}

function renderUserName(user: { first_name: string, last_name: string, username: string }) {
	const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
	return fullName || user.username || "-";
}

function RoleTable({ roles }: { roles: AdminUserSummaryRoleDto[] }) {
	return (
		<Table<AdminUserSummaryRoleDto>
			size="small"
			pagination={false}
			rowKey="id"
			dataSource={roles}
			locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="موردی وجود ندارد" /> }}
			columns={[
				{
					title: "نام نقش",
					dataIndex: "name",
					key: "name",
				},
				{
					title: "Scope",
					dataIndex: "scope",
					key: "scope",
					width: 140,
				},
				{
					title: "تعداد کاربر",
					dataIndex: "assigned_user_count",
					key: "assigned_user_count",
					width: 120,
					align: "center",
				},
				{
					title: "سرویس‌ها",
					dataIndex: "allowed_service_ids",
					key: "allowed_service_ids",
					render: (_, record) => (
						<Space size={[4, 4]} wrap>
							{record.allowed_service_ids.length > 0
								? record.allowed_service_ids.map(serviceId => <Tag key={serviceId}>{serviceId}</Tag>)
								: "-"}
						</Space>
					),
				},
			]}
		/>
	);
}

function DeputyCard({ deputy }: { deputy: AdminUserSummaryDeputyDto }) {
	const enabledPermissions = Object.entries(deputy.permissions)
		.filter(([, allowed]) => allowed)
		.map(([key]) => key);

	return (
		<div className="rounded-xl border border-[var(--ant-color-border-secondary)] p-4">
			<Space direction="vertical" size={12} className="w-full">
				<div>
					<Typography.Text strong>{deputy.username}</Typography.Text>
					<Typography.Text type="secondary">
						{" "}
						(ID:
						{" "}
						{deputy.deputy_user_id}
						)
					</Typography.Text>
				</div>

				<div>
					<Typography.Text type="secondary">دسترسی‌ها:</Typography.Text>
					<div className="mt-2">
						<Space size={[4, 4]} wrap>
							{enabledPermissions.length > 0
								? enabledPermissions.map(permission => <Tag key={permission}>{permission}</Tag>)
								: "-"}
						</Space>
					</div>
				</div>

				<div>
					<Typography.Text type="secondary">کاربران ایجادشده:</Typography.Text>
					<div className="mt-2">
						<Space size={[4, 4]} wrap>
							{deputy.created_user_ids.length > 0
								? deputy.created_user_ids.map(userId => <Tag key={userId}>{userId}</Tag>)
								: "-"}
						</Space>
					</div>
				</div>

				<div>
					<Typography.Text type="secondary">نقش‌های تحت مالکیت</Typography.Text>
					<div className="mt-2">
						<RoleTable roles={deputy.owned_roles} />
					</div>
				</div>
			</Space>
		</div>
	);
}

function SummaryContent({
	user,
	summary,
}: {
	user: AdminUserDto
	summary: AdminUserServiceAdminSummaryDto
}) {
	return (
		<Space direction="vertical" size={16} className="w-full">
			<Descriptions bordered size="small" column={2}>
				<Descriptions.Item label="کاربر">{renderUserName(user)}</Descriptions.Item>
				<Descriptions.Item label="نام کاربری">{user.username}</Descriptions.Item>
				<Descriptions.Item label="شناسه ادمین">{summary.admin_user_id}</Descriptions.Item>
				<Descriptions.Item label="سرویس‌های ادمین">
					<Space size={[4, 4]} wrap>
						{summary.service_admin_service_ids.length > 0
							? summary.service_admin_service_ids.map(serviceId => <Tag key={serviceId}>{serviceId}</Tag>)
							: "-"}
					</Space>
				</Descriptions.Item>
				<Descriptions.Item label="کاربران ایجادشده" span={2}>
					<Space size={[4, 4]} wrap>
						{summary.created_user_ids.length > 0
							? summary.created_user_ids.map(userId => <Tag key={userId}>{userId}</Tag>)
							: "-"}
					</Space>
				</Descriptions.Item>
			</Descriptions>

			<div>
				<Typography.Title level={5}>کاربران تحت مدیریت</Typography.Title>
				<List
					bordered
					locale={{ emptyText: "موردی وجود ندارد" }}
					dataSource={summary.managed_users}
					renderItem={managedUser => (
						<List.Item>
							<div>
								<Typography.Text strong>{renderUserName(managedUser)}</Typography.Text>
								<Typography.Text type="secondary">
									{" "}
									(
									{managedUser.username}
									)
								</Typography.Text>
								<div>{managedUser.email || "-"}</div>
							</div>
						</List.Item>
					)}
				/>
			</div>

			<div>
				<Typography.Title level={5}>نقش‌های تحت مالکیت</Typography.Title>
				<RoleTable roles={summary.owned_roles} />
			</div>

			<div>
				<Typography.Title level={5}>Deputies</Typography.Title>
				<Space direction="vertical" size={12} className="w-full">
					{summary.deputies.length > 0
						? summary.deputies.map(deputy => (
							<DeputyCard key={deputy.deputy_user_id} deputy={deputy} />
						))
						: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="موردی وجود ندارد" />}
				</Space>
			</div>
		</Space>
	);
}

export function AdminUserSummaryModal({ open, user, onClose }: Props) {
	const summaryQuery = useQuery({
		queryKey: ["admin-users", "service-admin-summary", user?.id ?? null],
		enabled: open && !!user,
		queryFn: () => fetchAdminUserServiceAdminSummary(user!.id),
		staleTime: 30 * 1000,
	});

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title="خلاصه دسترسی و مدیریت"
			footer={null}
			width={980}
			destroyOnHidden
		>
			<Spin spinning={summaryQuery.isLoading}>
				{user && summaryQuery.data
					? <SummaryContent user={user} summary={summaryQuery.data} />
					: !summaryQuery.isLoading
						? <Empty description="داده‌ای برای نمایش وجود ندارد" />
						: null}
			</Spin>
		</Modal>
	);
}
