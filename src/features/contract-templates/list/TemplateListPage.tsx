import type { ActionType, ProColumns } from "@ant-design/pro-components";
import type { TemplateListItemType } from "../model/templates.list.types";

import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { DeleteOutlined, EditOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { Button, Popconfirm } from "antd";
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { fetchDeleteTemplate, fetchTemplatesList } from "../api/templates.api";
import TemplateCreateModal from "../create/TemplateCreateModal";
import { getTemplateColumns } from "./constants";

export default function TemplateListPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const actionRef = useRef<ActionType>(null);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
	const handleOpenCreateModal = (e: React.MouseEvent) => {
		setClickPosition({ x: e.clientX, y: e.clientY });
		setIsCreateModalOpen(true);
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
				render: (_, record) => [
					<BasicButton
						key="edit"
						type="link"
						size="large"
						title="ویرایش قالب"
						icon={<EditOutlined />}
						onClick={() => {
							navigate(`/contracts/templates/${record.id}/edit`);
						}}
					/>,
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
							icon={<DeleteOutlined />}
						/>
					</Popconfirm>,
				],
			},
		];
	}, [baseColumns, navigate, t]);

	return (
		<BasicContent className="h-full">
			<BasicTable<TemplateListItemType>
				adaptive
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
				toolBarRender={() => [
					<Button
						key="addNewTemplate"
						icon={<PlusCircleOutlined />}
						type="primary"
						onClick={handleOpenCreateModal}
					>
						قالب جدید
					</Button>,
				]}
			/>
			{/* مودال تمام صفحه ایجاد قالب */}
			<TemplateCreateModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				originPosition={clickPosition}
			/>
		</BasicContent>
	);
}
