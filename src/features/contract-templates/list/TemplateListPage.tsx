// src/features/contract-templates/list/TemplateListPage.tsx
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import type { TemplateListItemType } from "../model/templates.list.types";

import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { useAccess } from "#src/hooks";
import { TableActionEditIcon, TableActionTrashIcon } from "#src/icons";
import { PlusCircleOutlined } from "@ant-design/icons";
import { Button, Popconfirm } from "antd";
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchDeleteTemplate, fetchTemplatesList } from "../api/templates.api";
import TemplateCreateModal from "../create/TemplateCreateModal";
import { getTemplateColumns } from "./constants";

export default function TemplateListPage() {
	const { t } = useTranslation();
	const actionRef = useRef<ActionType>(null);
	const { hasDomainPermission } = useAccess();

	const canCreate = hasDomainPermission("contract_template", "create");
	const canUpdateRow = (row: TemplateListItemType) =>
		hasDomainPermission("contract_template", "update", row.service, row.company_type);
	const canDeleteRow = (row: TemplateListItemType) =>
		hasDomainPermission("contract_template", "delete", row.service, row.company_type);

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
	const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });

	const handleOpenCreateModal = (e: React.MouseEvent) => {
		setClickPosition({ x: e.clientX, y: e.clientY });
		setEditingTemplateId(null);
		setIsCreateModalOpen(true);
	};

	const handleOpenEditModal = (e: React.MouseEvent, id: number) => {
		setClickPosition({ x: e.clientX, y: e.clientY });
		setEditingTemplateId(id);
		setIsCreateModalOpen(true);
	};

	const handleCloseModal = () => {
		setIsCreateModalOpen(false);
		setEditingTemplateId(null);
	};

	const handleModalSuccess = () => {
		actionRef.current?.reload?.();
	};

	const handleDeleteRow = async (row: TemplateListItemType) => {
		try {
			await fetchDeleteTemplate(row.id);
			window.$message?.success("تمپلیت با موفقیت حذف شد.");
			actionRef.current?.reload?.();
		}
		catch (error) {
			window.$message?.error("خطا در حذف تمپلیت.");
			console.error("Error deleting template:", error);
		}
	};

	const baseColumns = useMemo(
		() => getTemplateColumns({ t }),
		[t],
	);

	const columns: ProColumns<TemplateListItemType>[] = useMemo(() => {
		return [
			...baseColumns,
			{
				title: "عملیات",
				valueType: "option",
				key: "option",
				width: 120,
				fixed: "right",
				align: "center",
				render: (_, record) => {
					const actions: React.ReactNode[] = [];
					if (canUpdateRow(record)) {
						actions.push(
							<BasicButton
								key="edit"
								type="link"
								size="large"
								title="ویرایش قالب"
								icon={<TableActionEditIcon />}
								onClick={(e) => {
									handleOpenEditModal(e, record.id);
								}}
							/>,
						);
					}
					if (canDeleteRow(record)) {
						actions.push(
							<Popconfirm
								key="delete"
								title="آیا از حذف این تمپلیت مطمئن هستید؟"
								okText={t("common.confirm")}
								cancelText={t("common.cancel")}
								onConfirm={() => handleDeleteRow(record)}
							>
								<BasicButton
									type="link"
									size="large"
									title="حذف قالب"
									icon={<TableActionTrashIcon />}
								/>
							</Popconfirm>,
						);
					}
					return actions;
				},
			},
		];
	}, [baseColumns, canUpdateRow, canDeleteRow, t]);

	return (
		<BasicContent className="h-full">
			<BasicTable<TemplateListItemType>

				rowKey="id"
				columns={columns}
				actionRef={actionRef}
				request={async (params) => {
					const query = {
						page: params.current ?? 1,
						page_size: params.pageSize ?? 20,
						search: (params as any).search,
						ordering: (params as any).ordering,
					};

					const responseData = await fetchTemplatesList(query);

					return {
						data: responseData.results,
						total: responseData.count,
						success: true,
					};
				}}
				headerTitle="قالب‌های قرارداد"
				toolBarRender={() => {
					if (!canCreate) {
						return [];
					}
					return [
						<Button
							key="addNewTemplate"
							icon={<PlusCircleOutlined />}
							type="primary"
							onClick={handleOpenCreateModal}
						>
							قالب جدید
						</Button>,
					];
				}}
			/>

			<TemplateCreateModal
				isOpen={isCreateModalOpen}
				onClose={handleCloseModal}
				originPosition={clickPosition}

				onSuccess={handleModalSuccess}
				templateId={editingTemplateId}
			/>
		</BasicContent>
	);
}
