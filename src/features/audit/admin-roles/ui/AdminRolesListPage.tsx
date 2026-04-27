import type { ServiceDto } from "#src/api/common/common.types";
import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";
import type { AdminRoleDto } from "../model/admin-roles.types";

import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { useAccess } from "#src/hooks";
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Popconfirm } from "antd";
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
	fetchAdminRolesList,
	fetchBulkUpsertAdminRolePolicies,
	fetchCreateAdminRole,
	fetchDeleteAdminRole,
	fetchUpdateAdminRole,
} from "../api/admin-roles.api";
import { adminRoleServicesQuery } from "../queries/admin-roles.queries";
import { AdminRoleDetailsModal } from "./components/AdminRoleDetailsModal";
import { AdminRoleUpsertModal } from "./components/AdminRoleUpsertModal";
import { getAdminRolesColumns } from "./constants/admin-roles.columns";

export default function AdminRolesListPage() {
	const { t } = useTranslation();
	const { hasAdminPanelAccess } = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [openUpsert, setOpenUpsert] = useState(false);
	const [openDetails, setOpenDetails] = useState(false);
	const [upsertMode, setUpsertMode] = useState<"create" | "edit">("create");
	const [selectedRole, setSelectedRole] = useState<AdminRoleDto | null>(null);

	const canManageRoles = hasAdminPanelAccess("roles");
	const canManagePolicies = hasAdminPanelAccess("policies");
	const canCreate = canManageRoles;
	const canUpdate = canManageRoles || canManagePolicies;
	const canDelete = canManageRoles;

	const servicesQuery = useQuery(adminRoleServicesQuery());

	const serviceNameById = useMemo(
		() => new Map<number, string>((servicesQuery.data?.results ?? []).map((service: ServiceDto) => [service.id, service.name])),
		[servicesQuery.data],
	);

	const baseColumns = useMemo(
		() => getAdminRolesColumns({ t, serviceNameById }),
		[t, serviceNameById],
	);

	function refreshTable() {
		actionRef.current?.reload?.();
	}

	function handleOpenCreate() {
		setUpsertMode("create");
		setSelectedRole(null);
		setOpenUpsert(true);
	}

	function handleOpenEdit(role: AdminRoleDto) {
		setUpsertMode("edit");
		setSelectedRole(role);
		setOpenUpsert(true);
	}

	function handleOpenDetails(role: AdminRoleDto) {
		setSelectedRole(role);
		setOpenDetails(true);
	}

	async function handleDeleteRole(role: AdminRoleDto, action?: ProCoreActionType<object>) {
		if (!canDelete) {
			window.$message?.warning("دسترسی حذف نقش را ندارید.");
			return;
		}

		await fetchDeleteAdminRole(role.id);
		await action?.reload?.();
		window.$message?.success(t("common.deleteSuccess"));
	}

	const columns: ProColumns<AdminRoleDto>[] = useMemo(() => {
		return [
			...baseColumns,
			{
				title: t("common.action"),
				valueType: "option",
				key: "option",
				width: 170,
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
								title="ویرایش نقش"
								icon={<EditOutlined />}
								onClick={() => handleOpenEdit(record)}
							/>,
						);
					}

					actions.push(
						<BasicButton
							key="details"
							type="link"
							size="large"
							title="جزئیات"
							icon={<EyeOutlined />}
							onClick={() => handleOpenDetails(record)}
						/>,
					);

					if (canDelete) {
						actions.push(
							<Popconfirm
								key="delete"
								title={t("common.confirmDelete")}
								okText={t("common.confirm")}
								cancelText={t("common.cancel")}
								onConfirm={() => handleDeleteRole(record, action)}
							>
								<BasicButton type="link" size="large" title="حذف نقش" icon={<DeleteOutlined />} />
							</Popconfirm>,
						);
					}

					return actions;
				},
			},
		];
	}, [baseColumns, canDelete, canUpdate, t]);

	return (
		<BasicContent className="h-full">
			<BasicTable<AdminRoleDto>
				adaptive
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
					};

					const responseData = await fetchAdminRolesList(query);

					return {
						...responseData,
						data: responseData.results,
						total: responseData.count,
					};
				}}
				headerTitle="مدیریت نقش‌ها"
				toolBarRender={() => {
					if (!canCreate) {
						return [];
					}

					return [
						<Button
							key="add-role"
							icon={<PlusCircleOutlined />}
							type="primary"
							onClick={handleOpenCreate}
						>
							ایجاد نقش
						</Button>,
					];
				}}
			/>

			<AdminRoleUpsertModal
				open={openUpsert}
				mode={upsertMode}
				initial={selectedRole}
				onClose={() => {
					setOpenUpsert(false);
					setSelectedRole(null);
				}}
				onSubmit={async ({ role, policies }) => {
					if (upsertMode === "create") {
						const createdRole = await fetchCreateAdminRole(role);
						await fetchBulkUpsertAdminRolePolicies(createdRole.id, policies);
						window.$message?.success("نقش با موفقیت ایجاد شد.");
					}
					else {
						if (!selectedRole) {
							return;
						}

						await fetchUpdateAdminRole(selectedRole.id, role);
						await fetchBulkUpsertAdminRolePolicies(selectedRole.id, policies);
						window.$message?.success("نقش با موفقیت به‌روزرسانی شد.");
					}

					refreshTable();
				}}
			/>

			<AdminRoleDetailsModal
				open={openDetails}
				role={selectedRole}
				serviceNameById={serviceNameById}
				onClose={() => {
					setOpenDetails(false);
					setSelectedRole(null);
				}}
			/>
		</BasicContent>
	);
}
