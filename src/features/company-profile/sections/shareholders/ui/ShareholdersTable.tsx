import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";
import type { ShareholderDto } from "../model/shareholders.types";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { PlusCircleOutlined } from "@ant-design/icons";

import { Button, Popconfirm } from "antd";
import React, { useMemo, useRef, useState } from "react";
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

	const [modalOpen, setModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<"create" | "edit">("create");
	const [editing, setEditing] = useState<ShareholderDto | null>(null);

	const refreshTable = () => actionRef.current?.reload?.();

	const handleDeleteRow = async (row: ShareholderDto, action?: ProCoreActionType<object>) => {
		await deleteShareholder(row.id);
		await action?.reload?.();
		window.$message?.success("حذف شد");
	};

	const baseColumns = useMemo(() => getShareholderColumns(), []);

	const columns: ProColumns<ShareholderDto>[] = useMemo(() => {
		return [
			...baseColumns,
			{
				title: "عملیات",
				valueType: "option",
				key: "option",
				width: 120,
				fixed: "right",
				render: (_, record, __, action) => [
					<BasicButton
						key="edit"
						type="link"
						size="small"
						onClick={() => {
							setEditing(record);
							setModalMode("edit");
							setModalOpen(true);
						}}
					>
						ویرایش
					</BasicButton>,
					<Popconfirm
						key="delete"
						title="حذف شود؟"
						okText="تایید"
						cancelText="انصراف"
						onConfirm={() => handleDeleteRow(record, action)}
					>
						<BasicButton type="link" size="small">
							حذف
						</BasicButton>
					</Popconfirm>,
				],
			},
		];
	}, [baseColumns]);

	return (
		<BasicContent className="h-full">
			<BasicTable<ShareholderDto>
				adaptive
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
				toolBarRender={() => [
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
				]}
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
