import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";
import type { ShareholderDto } from "../model/shareholders.types";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { useAccess } from "#src/hooks";
import { TableActionEditIcon, TableActionTrashIcon } from "#src/icons";
import { PlusCircleOutlined } from "@ant-design/icons";

import { Button, Popconfirm } from "antd";
import React, { useMemo, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { deleteShareholder, listShareholders } from "../../../api/shareholders.api";
import { getShareholderColumns } from "./shareholders.columns";
import ShareholderUpsertModal from "./ShareholderUpsertModal";

interface Props {
	serviceId: number
	companyId: number
}

export default function ShareholdersTable({ serviceId, companyId }: Props) {
	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);
	const { hasDomainPermissionByServiceId } = useAccess();
	const companyType = useWatch<CompanyProfileFormValues, "companyType">({ name: "companyType" });

	const canCreate = hasDomainPermissionByServiceId("company_profile", "create", serviceId, companyType);
	const canUpdate = hasDomainPermissionByServiceId("company_profile", "update", serviceId, companyType);
	const canDelete = hasDomainPermissionByServiceId("company_profile", "delete", serviceId, companyType);

	const [modalOpen, setModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<"create" | "edit">("create");
	const [editing, setEditing] = useState<ShareholderDto | null>(null);

	const refreshTable = () => actionRef.current?.reload?.();

	const handleDeleteRow = async (row: ShareholderDto, action?: ProCoreActionType<object>) => {
		if (!canDelete) {
			window.$message?.warning("دسترسی حذف سهامدار را ندارید.");
			return;
		}
		await deleteShareholder(row.id);
		await action?.reload?.();
		window.$message?.success("حذف شد");
	};

	const baseColumns = useMemo(() => getShareholderColumns(), []);

	const columns: ProColumns<ShareholderDto>[] = useMemo(() => {
		const cols = [...baseColumns];
		if (canUpdate || canDelete) {
			cols.push({
				title: "عملیات",
				valueType: "option",
				key: "option",
				width: 120,
				fixed: "right",
				align: "center",
				render: (_, record, __, action) => {
					const actions = [] as React.ReactNode[];
					if (canUpdate) {
						actions.push(
							<BasicButton
								key="edit"
								type="link"
								size="large"
								title="ویرایش سهامدار"
								icon={<TableActionEditIcon />}
								onClick={() => {
									setEditing(record);
									setModalMode("edit");
									setModalOpen(true);
								}}
							/>,
						);
					}
					if (canDelete) {
						actions.push(
							<Popconfirm
								key="delete"
								title="حذف شود؟"
								okText="تایید"
								cancelText="انصراف"
								onConfirm={() => handleDeleteRow(record, action)}
							>
								<BasicButton type="link" size="large" icon={<TableActionTrashIcon />} title="حذف سهامدار" />
							</Popconfirm>,
						);
					}
					return actions;
				},
			});
		}
		return cols;
	}, [baseColumns, canDelete, canUpdate]);

	return (
		<BasicContent className="h-full">
			<BasicTable<ShareholderDto>
				rowKey="id"
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				request={async (params) => {
					const query = {
						company: companyId,
						page: params.current ?? 1,
						search: (params as any).search,
						ordering: (params as any).ordering,
					};

					const responseData = await listShareholders(query as any);

					return {
						...responseData,
						data: responseData.results,
						total: responseData.count,
					};
				}}
				headerTitle="لیست سهامداران"
				toolBarRender={() => {
					if (!canCreate)
						return [];
					return [
						<Button
							key="add"
							icon={<PlusCircleOutlined />}
							type="primary"
							onClick={() => {
								setEditing(null);
								setModalMode("create");
								setModalOpen(true);
							}}
						>
							افزودن
						</Button>,
					];
				}}
			/>

			<ShareholderUpsertModal
				open={modalOpen}
				mode={modalMode}
				initial={editing}
				serviceId={serviceId}
				companyId={companyId}
				onClose={() => {
					setModalOpen(false);
					setEditing(null);
				}}
				onSaved={refreshTable}
			/>
		</BasicContent>
	);
}
