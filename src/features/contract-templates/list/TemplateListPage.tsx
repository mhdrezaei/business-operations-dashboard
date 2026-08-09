// src/features/contract-templates/list/TemplateListPage.tsx
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import type { TemplateListItemType } from "../model/templates.list.types";

import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { DeleteOutlined, EditOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { Button, Popconfirm } from "antd";
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchDeleteTemplate, fetchTemplatesList } from "../api/templates.api";
import TemplateCreateModal from "../create/TemplateCreateModal";
import { getTemplateColumns } from "./constants";

export default function TemplateListPage() {
	const { t } = useTranslation();
	const actionRef = useRef<ActionType>(null);

	// State برای کنترل باز بودن مودال
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	// State برای نگهداری آیدی در حالت ویرایش (اگر null باشد یعنی حالت Create)
	const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
	const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });

	// باز کردن مودال در حالت ایجاد (Create)
	const handleOpenCreateModal = (e: React.MouseEvent) => {
		setClickPosition({ x: e.clientX, y: e.clientY });
		setEditingTemplateId(null); // حتماً null شود تا فرم خالی باز شود
		setIsCreateModalOpen(true);
	};

	// باز کردن مودال در حالت ویرایش (Edit)
	const handleOpenEditModal = (e: React.MouseEvent, id: number) => {
		setClickPosition({ x: e.clientX, y: e.clientY });
		setEditingTemplateId(id); // پاس دادن ID برای فچ کردن اطلاعات در فرم
		setIsCreateModalOpen(true);
	};

	// بستن مودال
	const handleCloseModal = () => {
		setIsCreateModalOpen(false);
		setEditingTemplateId(null);
	};

	// 🔴 سیگنال موفقیت: زمانی که فرم با موفقیت ذخیره/ویرایش شد، این تابع صدا زده می‌شود
	const handleModalSuccess = () => {
		actionRef.current?.reload?.(); // رفرش تمیز و بدون پرشِ جدول
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
						onClick={(e) => {
							// 🔴 تغییر در اینجا: به جای navigate، مودال را در حالت ویرایش باز می‌کنیم
							handleOpenEditModal(e, record.id);
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
	}, [baseColumns, t]);

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

			{/* مودال تمام صفحه ایجاد/ویرایش قالب */}
			<TemplateCreateModal
				isOpen={isCreateModalOpen}
				onClose={handleCloseModal}
				originPosition={clickPosition}

				// 🔴 پراپ‌های حیاتی برای توسعه و رفرش اصولی
				onSuccess={handleModalSuccess}
				templateId={editingTemplateId} // اگر null باشد یعنی Create است، اگر عدد باشد یعنی Edit است
			/>
		</BasicContent>
	);
}
