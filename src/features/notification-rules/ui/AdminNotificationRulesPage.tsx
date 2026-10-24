import type { ServiceDto } from "#src/api/common/common.types";
import type { AdminRoleDto } from "#src/features/audit/admin-roles/model/admin-roles.types";
import type { AdminUserDto } from "#src/features/audit/admin-users/model/admin-users.types";
import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";
import type { NotificationManualJob } from "../api/notification-rules.api";
import type { NotificationRuleCode, NotificationRuleDto } from "../model/notification-rules.types";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { emitNotificationSync } from "#src/features/notification/shared/notification-sync";
import { useAccess } from "#src/hooks";
import { TableActionEditIcon, TableActionTrashIcon } from "#src/icons";
import { PlayCircleOutlined, PlusCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
	const { hasAdminAction } = useAccess();
	const queryClient = useQueryClient();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [openUpsert, setOpenUpsert] = useState(false);
	const [upsertMode, setUpsertMode] = useState<"create" | "edit">("create");
	const [selectedRule, setSelectedRule] = useState<NotificationRuleDto | null>(null);

	const canCreate = hasAdminAction("notification_rules", "create") || hasAdminAction("policies", "create");
	const canUpdate = hasAdminAction("notification_rules", "update") || hasAdminAction("policies", "update");
	const canDelete = hasAdminAction("notification_rules", "delete") || hasAdminAction("policies", "delete");

	const servicesQuery = useQuery(notificationRuleServicesQuery());
	const usersQuery = useQuery(notificationRuleUsersQuery());
	const rolesQuery = useQuery(notificationRuleRolesQuery());
	const latestRunQuery = useQuery(latestNotificationRunQuery());

	const runJobMutation = useMutation({
		mutationFn: fetchRunNotificationJob,
		onSuccess: async (response, job) => {
			window.$message?.success(`Job در صف قرار گرفت. status: ${response.status} | task_id: ${response.task_id}`);
			await Promise.all([
				latestRunQuery.refetch(),
				...(job === "IN_APP" || job === "MISSING_PREV_MONTH_IN_APP"
					? [queryClient.invalidateQueries({ queryKey: ["notifications", "inbox"] })]
					: []),
			]);

			if (job === "IN_APP" || job === "MISSING_PREV_MONTH_IN_APP") {
				refreshInAppNotificationsUntilDelivered();
			}
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
		() => getNotificationRulesColumns({ userNameById, roleNameById }),
		[t, userNameById, roleNameById],
	);

	function refreshTable() {
		actionRef.current?.reload?.();
	}

	function refreshInAppNotifications() {
		void queryClient.refetchQueries({
			queryKey: ["notifications", "inbox"],
			type: "all",
		});
		emitNotificationSync();
	}

	function refreshInAppNotificationsUntilDelivered() {
		for (let attempt = 0; attempt < 10; attempt += 1) {
			window.setTimeout(() => refreshInAppNotifications(), attempt * 1500);
		}
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
							icon={<TableActionEditIcon />}
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
							<BasicButton type="link" size="large" title="حذف Rule" icon={<TableActionTrashIcon />} />
						</Popconfirm>,
					);
				}

				return actions;
			},
		},
	], [baseColumns, canDelete, canUpdate, t]);

	const latestRun = latestRunQuery.data;
	const runMeta = latestRun?.meta ?? {};
	const manualJobs: Array<{ key: NotificationManualJob, label: string }> = [
		{ key: "IN_APP", label: "Run Contract Expiry IN_APP Now" },
		{ key: "SMS", label: "Run Contract Expiry SMS Now" },
		{ key: "MISSING_PREV_MONTH_IN_APP", label: "Run Missing Prev Month IN_APP Now" },
		{ key: "MISSING_PREV_MONTH_SMS", label: "Run Missing Prev Month SMS Now" },
		{ key: "BUSINESS_APPROVAL_PENDING", label: "Run Business Approval Pending Now" },
		{ key: "SIGN_PENDING", label: "Run Sign Pending Now" },
	];

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
							code: (params as Record<string, unknown>).code as NotificationRuleCode | undefined,
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
					<div className="mb-4 flex flex-wrap items-center gap-3">
						<Typography.Title level={4} className="!mb-0">
							اجرای دستی Job
						</Typography.Title>
						<Space wrap className="mr-auto">
							{canUpdate && manualJobs.map(job => (
								<Button
									key={job.key}
									type="primary"
									icon={<PlayCircleOutlined />}
									loading={runJobMutation.isPending && runJobMutation.variables === job.key}
									onClick={() => runJobMutation.mutate(job.key)}
								>
									{job.label}
								</Button>
							))}
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
