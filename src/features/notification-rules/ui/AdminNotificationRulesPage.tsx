import type { ServiceDto } from "#src/api/common/common.types";
import type { AdminRoleDto } from "#src/features/audit/admin-roles/model/admin-roles.types";
import type { AdminUserDto } from "#src/features/audit/admin-users/model/admin-users.types";
import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";
import type { NotificationRuleDto } from "../model/notification-rules.types";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { useAccess } from "#src/hooks";
import { DeleteOutlined, EditOutlined, PlayCircleOutlined, PlusCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Descriptions, Empty, Popconfirm, Space, Tag, Typography } from "antd";
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	fetchCreateNotificationRule,
	fetchDeleteNotificationRule,
	fetchNotificationRulesList,
	fetchRunNotificationJob,
	fetchUpdateNotificationRule,
} from "../api/notification-rules.api";
import { formatAdminRoleName, formatAdminUserName, formatRuleDate } from "../model/notification-rules.utils";
import {
	latestNotificationRunQuery,
	notificationRuleRolesQuery,
	notificationRuleServicesQuery,
	notificationRuleUsersQuery,
} from "../queries/notification-rules.queries";
import { NotificationRuleUpsertModal } from "./components/NotificationRuleUpsertModal";
import { getNotificationRulesColumns } from "./constants/notification-rules.columns";

function renderRunStatus(status?: string | null) {
	if (!status) {
		return <Tag>-</Tag>;
	}

	const color = status === "SUCCESS" ? "success" : status === "FAILURE" ? "error" : "processing";
	return <Tag color={color}>{status}</Tag>;
}

export default function AdminNotificationRulesPage() {
	const { t } = useTranslation();
	const { hasDomainPermission } = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [openUpsert, setOpenUpsert] = useState(false);
	const [upsertMode, setUpsertMode] = useState<"create" | "edit">("create");
	const [selectedRule, setSelectedRule] = useState<NotificationRuleDto | null>(null);

	const canCreate = hasDomainPermission("contracts", "create");
	const canUpdate = hasDomainPermission("contracts", "update");
	const canDelete = hasDomainPermission("contracts", "delete");

	const servicesQuery = useQuery(notificationRuleServicesQuery());
	const usersQuery = useQuery(notificationRuleUsersQuery());
	const rolesQuery = useQuery(notificationRuleRolesQuery());
	const latestRunQuery = useQuery(latestNotificationRunQuery());

	const runJobMutation = useMutation({
		mutationFn: fetchRunNotificationJob,
		onSuccess: async () => {
			window.$message?.success("Job اجرا شد.");
			await latestRunQuery.refetch();
		},
		onError: () => {
			window.$message?.error("اجرای Job با خطا مواجه شد. مسیر API اجرای دستی را بررسی کنید.");
		},
	});

	const services = useMemo<ServiceDto[]>(() => servicesQuery.data?.results ?? [], [servicesQuery.data]);
	const users = useMemo<AdminUserDto[]>(() => usersQuery.data?.results ?? [], [usersQuery.data]);
	const roles = useMemo<AdminRoleDto[]>(() => rolesQuery.data?.results ?? [], [rolesQuery.data]);

	const userNameById = useMemo(
		() => new Map<number, string>(users.map(user => [user.id, formatAdminUserName(user)])),
		[users],
	);
	const roleNameById = useMemo(
		() => new Map<number, string>(roles.map(role => [role.id, formatAdminRoleName(role)])),
		[roles],
	);

	const baseColumns = useMemo(
		() => getNotificationRulesColumns({ t, userNameById, roleNameById }),
		[t, userNameById, roleNameById],
	);

	function refreshTable() {
		actionRef.current?.reload?.();
	}

	function handleOpenCreate() {
		setUpsertMode("create");
		setSelectedRule(null);
		setOpenUpsert(true);
	}

	function handleOpenEdit(rule: NotificationRuleDto) {
		setUpsertMode("edit");
		setSelectedRule(rule);
		setOpenUpsert(true);
	}

	async function handleDeleteRule(rule: NotificationRuleDto, action?: ProCoreActionType<object>) {
		if (!canDelete) {
			window.$message?.warning("دسترسی حذف Rule را ندارید.");
			return;
		}

		await fetchDeleteNotificationRule(rule.id);
		await action?.reload?.();
		window.$message?.success(t("common.deleteSuccess"));
	}

	const columns: ProColumns<NotificationRuleDto>[] = useMemo(() => [
		...baseColumns,
		{
			title: t("common.action"),
			valueType: "option",
			key: "option",
			width: 140,
			fixed: "right",
			align: "center",
			render: (_, record, __, action) => {
				const actions: React.ReactNode[] = [];

				if (canUpdate) {
					actions.push(
						<BasicButton
							key="edit"
							type="link"
							size="large"
							title="ویرایش Rule"
							icon={<EditOutlined />}
							onClick={() => handleOpenEdit(record)}
						/>,
					);
				}

				if (canDelete) {
					actions.push(
						<Popconfirm
							key="delete"
							title={t("common.confirmDelete")}
							okText={t("common.confirm")}
							cancelText={t("common.cancel")}
							onConfirm={() => handleDeleteRule(record, action)}
						>
							<BasicButton type="link" size="large" title="حذف Rule" icon={<DeleteOutlined />} />
						</Popconfirm>,
					);
				}

				return actions;
			},
		},
	], [baseColumns, canDelete, canUpdate, t]);

	const latestRun = latestRunQuery.data;
	const runMeta = latestRun?.meta ?? {};

	return (
		<BasicContent className="h-full !overflow-y-auto">
			<div className="flex flex-col gap-5">
				<BasicTable<NotificationRuleDto>
					adaptive={{ offsetBottom: 240 }}
					rowKey="id"
					columns={columns}
					actionRef={actionRef}
					formRef={formRef}
					request={async (params) => {
						const query = {
							page: params.current ?? 1,
							page_size: params.pageSize ?? 10,
							search: (params as Record<string, unknown>).search as string | undefined,
							ordering: (params as Record<string, unknown>).ordering as string | undefined,
							code: (params as Record<string, unknown>).code as "CONTRACT_EXPIRY" | "CONTRACT_EXPIRY_SMS" | undefined,
							is_active: typeof (params as Record<string, unknown>).is_active === "string"
								? (params as Record<string, unknown>).is_active === "true"
								: undefined,
						};

						const responseData = await fetchNotificationRulesList(query);

						return {
							...responseData,
							data: responseData.results,
							total: responseData.count,
						};
					}}
					headerTitle="مدیریت Rule نوتیفیکیشن"
					toolBarRender={() => {
						if (!canCreate) {
							return [];
						}

						return [
							<Button
								key="add-rule"
								icon={<PlusCircleOutlined />}
								type="primary"
								onClick={handleOpenCreate}
							>
								ایجاد Rule
							</Button>,
						];
					}}
				/>

				<section className="rounded-lg border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-4">
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<Typography.Title level={4} className="!mb-0">
							اجرای دستی Job
						</Typography.Title>
						<Space wrap>
							<Button
								type="primary"
								icon={<PlayCircleOutlined />}
								loading={runJobMutation.isPending && runJobMutation.variables === "SMS"}
								onClick={() => runJobMutation.mutate("SMS")}
							>
								Run Contract Expiry SMS Now
							</Button>
							<Button
								type="primary"
								icon={<PlayCircleOutlined />}
								loading={runJobMutation.isPending && runJobMutation.variables === "IN_APP"}
								onClick={() => runJobMutation.mutate("IN_APP")}
							>
								Run Contract Expiry IN_APP Now
							</Button>
							<Button
								icon={<ReloadOutlined />}
								loading={latestRunQuery.isFetching}
								onClick={() => latestRunQuery.refetch()}
							>
								به‌روزرسانی
							</Button>
						</Space>
					</div>

					{latestRun
						? (
							<Descriptions
								bordered
								column={{ xs: 1, sm: 2, lg: 3 }}
								size="small"
								title="آخرین اجرا"
							>
								<Descriptions.Item label="job_name">{latestRun.job_name}</Descriptions.Item>
								<Descriptions.Item label="status">{renderRunStatus(latestRun.status)}</Descriptions.Item>
								<Descriptions.Item label="today">{String(runMeta.today ?? "-")}</Descriptions.Item>
								<Descriptions.Item label="started_at">{formatRuleDate(latestRun.started_at)}</Descriptions.Item>
								<Descriptions.Item label="finished_at">{formatRuleDate(latestRun.finished_at)}</Descriptions.Item>
								<Descriptions.Item label="scanned_contracts">{String(runMeta.scanned_contracts ?? "-")}</Descriptions.Item>
								<Descriptions.Item label="created_events">{String(runMeta.created_events ?? "-")}</Descriptions.Item>
								<Descriptions.Item label="task_id" span={2}>{String(runMeta.task_id ?? "-")}</Descriptions.Item>
							</Descriptions>
						)
						: <Empty description="اطلاعات آخرین اجرا موجود نیست." />}
				</section>
			</div>

			<NotificationRuleUpsertModal
				open={openUpsert}
				mode={upsertMode}
				initial={selectedRule}
				services={services}
				users={users}
				roles={roles}
				loadingOptions={servicesQuery.isLoading || usersQuery.isLoading || rolesQuery.isLoading}
				onClose={() => {
					setOpenUpsert(false);
					setSelectedRule(null);
				}}
				onSubmit={async (payload) => {
					if (upsertMode === "create") {
						await fetchCreateNotificationRule(payload);
						window.$message?.success("Rule با موفقیت ایجاد شد.");
					}
					else {
						if (!selectedRule) {
							return;
						}
						await fetchUpdateNotificationRule(selectedRule.id, payload);
						window.$message?.success("Rule با موفقیت به‌روزرسانی شد.");
					}

					refreshTable();
				}}
			/>
		</BasicContent>
	);
}
