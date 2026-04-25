import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";
import type { AdminRoleDto, AdminUserDto } from "../model/admin-users.types";

import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { useAccess } from "#src/hooks";
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusCircleOutlined, SafetyOutlined, StopOutlined, TeamOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Popconfirm } from "antd";
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
	fetchAdminUserDetail,
	fetchAdminUsersList,
	fetchCreateAdminUser,
	fetchDeleteAdminUser,
	fetchDisableAdminUser,
	fetchEnableAdminUser,
	fetchSetAdminUserRoles,
	fetchUpdateAdminUser,
} from "../api/admin-users.api";
import { adminRolesQuery } from "../queries/admin-users.queries";
import { AdminUserRolesModal } from "./components/AdminUserRolesModal";
import { AdminUserSummaryModal } from "./components/AdminUserSummaryModal";
import { AdminUserUpsertModal } from "./components/AdminUserUpsertModal";
import { getAdminUsersColumns } from "./constants/admin-users.columns";

export default function AdminUsersListPage() {
	const { t } = useTranslation();
	const { hasDomainPermission } = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [openUpsert, setOpenUpsert] = useState(false);
	const [upsertMode, setUpsertMode] = useState<"create" | "edit">("create");
	const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
	const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
	const [loadingUserDetail, setLoadingUserDetail] = useState(false);

	const [openRoles, setOpenRoles] = useState(false);
	const [openSummary, setOpenSummary] = useState(false);

	// permissions
	const canCreate = hasDomainPermission("contracts", "create");
	const canUpdate = hasDomainPermission("contracts", "update");
	const canDelete = hasDomainPermission("contracts", "delete");
	const canSetRoles = hasDomainPermission("contracts", "update");
	const canToggleActive = hasDomainPermission("contracts", "update");

	const rolesQuery = useQuery(adminRolesQuery());

	const rolesList: AdminRoleDto[] = useMemo(() => rolesQuery.data?.results ?? [], [rolesQuery.data]);
	const roleNameById = useMemo(
		() => new Map<number, string>(rolesList.map(role => [role.id, role.name])),
		[rolesList],
	);

	const refreshTable = () => actionRef.current?.reload?.();

	const baseColumns = useMemo(
		() => getAdminUsersColumns({ t, roleNameById }),
		[t, roleNameById],
	);

	const handleOpenCreate = () => {
		setUpsertMode("create");
		setSelectedUserId(null);
		setSelectedUser(null);
		setOpenUpsert(true);
	};

	const handleOpenEdit = async (id: number) => {
		setUpsertMode("edit");
		setSelectedUserId(id);
		setSelectedUser(null);
		setOpenUpsert(true);

		setLoadingUserDetail(true);
		try {
			const dto = await fetchAdminUserDetail(id);
			setSelectedUser(dto);
		}
		finally {
			setLoadingUserDetail(false);
		}
	};

	const handleDeleteRow = async (row: AdminUserDto, action?: ProCoreActionType<object>) => {
		if (!canDelete) {
			window.$message?.warning("دسترسی حذف کاربر ندارید.");
			return;
		}
		await fetchDeleteAdminUser(row.id);
		await action?.reload?.();
		window.$message?.success(t("common.deleteSuccess"));
	};

	const handleToggleActive = async (row: AdminUserDto, action?: ProCoreActionType<object>) => {
		if (!canToggleActive) {
			window.$message?.warning("دسترسی تغییر وضعیت کاربر ندارید.");
			return;
		}

		if (row.is_active) {
			await fetchDisableAdminUser(row.id);
			window.$message?.success("کاربر غیرفعال شد.");
		}
		else {
			await fetchEnableAdminUser(row.id);
			window.$message?.success("کاربر فعال شد.");
		}

		await action?.reload?.();
	};

	const handleOpenRoles = async (row: AdminUserDto) => {
		if (!canSetRoles) {
			window.$message?.warning("دسترسی تغییر نقش کاربر ندارید.");
			return;
		}
		// اگر roles نیاز به detail داشت، می‌تونی detail بگیری. فعلاً همون row کافی است.
		setSelectedUserId(row.id);
		setSelectedUser(row);
		setOpenRoles(true);

		// اگر rolesQuery هنوز نیومده، می‌تونی اینجا رفرش کنی
		if (!rolesQuery.data) {
			await rolesQuery.refetch();
		}
	};

	const handleOpenSummary = (row: AdminUserDto) => {
		setSelectedUser(row);
		setOpenSummary(true);
	};

	const columns: ProColumns<AdminUserDto>[] = useMemo(() => {
		return [
			...baseColumns,
			{
				title: t("common.action"),
				valueType: "option",
				key: "option",
				width: 180,
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
								title="ویرایش کاربر"
								icon={<EditOutlined />}
								onClick={() => handleOpenEdit(record.id)}
							/>,
						);
					}

					if (canSetRoles) {
						actions.push(
							<BasicButton
								key="roles"
								type="link"
								size="large"
								title="نقش‌ها"
								icon={<TeamOutlined />}
								onClick={() => handleOpenRoles(record)}
							/>,
						);
					}

					actions.push(
						<BasicButton
							key="summary"
							type="link"
							size="large"
							title="خلاصه"
							icon={<EyeOutlined />}
							onClick={() => handleOpenSummary(record)}
						/>,
					);

					if (canToggleActive) {
						const isActive = !!record.is_active;
						actions.push(
							<Popconfirm
								key="toggle"
								title={isActive ? "کاربر غیرفعال شود؟" : "کاربر فعال شود؟"}
								okText={t("common.confirm")}
								cancelText={t("common.cancel")}
								onConfirm={() => handleToggleActive(record, action)}
							>
								<BasicButton
									type="link"
									size="large"
									title={isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
									icon={isActive ? <StopOutlined /> : <SafetyOutlined />}
								/>
							</Popconfirm>,
						);
					}

					if (canDelete) {
						actions.push(
							<Popconfirm
								key="delete"
								title={t("common.confirmDelete")}
								okText={t("common.confirm")}
								cancelText={t("common.cancel")}
								onConfirm={() => handleDeleteRow(record, action)}
							>
								<BasicButton type="link" size="large" title="حذف" icon={<DeleteOutlined />} />
							</Popconfirm>,
						);
					}

					return actions;
				},
			},
		];
	}, [baseColumns, canDelete, canSetRoles, canToggleActive, canUpdate, t]);

	return (
		<BasicContent className="h-full">
			<BasicTable<AdminUserDto>
				adaptive
				rowKey="id"
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				request={async (params) => {
					const query = {
						page: params.current ?? 1,
						page_size: params.pageSize ?? 20,
						search: (params as any).search,
						ordering: (params as any).ordering,
					};

					const responseData = await fetchAdminUsersList(query);

					return {
						...responseData,
						data: responseData.results,
						total: responseData.count,
					};
				}}
				headerTitle="مدیریت کاربران"
				toolBarRender={() => {
					if (!canCreate)
						return [];
					return [
						<Button
							key="add"
							icon={<PlusCircleOutlined />}
							type="primary"
							onClick={handleOpenCreate}
						>
							ایجاد کاربر
						</Button>,
					];
				}}
			/>

			<AdminUserUpsertModal
				open={openUpsert}
				mode={upsertMode}
				loading={loadingUserDetail && upsertMode === "edit"}
				initial={selectedUser}
				onClose={() => {
					setOpenUpsert(false);
					setSelectedUserId(null);
					setSelectedUser(null);
				}}
				onSubmit={async (payload) => {
					if (upsertMode === "create") {
						await fetchCreateAdminUser(payload);
						window.$message?.success("کاربر ایجاد شد.");
					}
					else {
						if (!selectedUserId)
							return;
						await fetchUpdateAdminUser(selectedUserId, payload);
						window.$message?.success("کاربر بروزرسانی شد.");
					}
					refreshTable();
				}}
			/>

			<AdminUserRolesModal
				open={openRoles}
				user={selectedUser}
				roles={rolesList}
				loading={rolesQuery.isLoading}
				onClose={() => setOpenRoles(false)}
				onSubmit={async (roleIds) => {
					if (!selectedUserId)
						return;
					await fetchSetAdminUserRoles(selectedUserId, { role_ids: roleIds });
					window.$message?.success("نقش‌های کاربر بروزرسانی شد.");
					setOpenRoles(false);
					refreshTable();
				}}
			/>

			<AdminUserSummaryModal
				open={openSummary}
				user={selectedUser}
				onClose={() => {
					setOpenSummary(false);
					setSelectedUser(null);
				}}
			/>
		</BasicContent>
	);
}
