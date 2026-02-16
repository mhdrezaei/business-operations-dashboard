// src/features/company-profile/sections/key-people/ui/CompanyPeoplePanel.tsx
import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";
import type { CompanyProfileFormValues } from "../../../model/company-profile.form.types";
import type { CompanyPersonDto } from "../model/company-people.types";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { PlusCircleOutlined } from "@ant-design/icons";

import { Button, Popconfirm } from "antd";
import React, { useMemo, useRef, useState } from "react";

import { useWatch } from "react-hook-form";
import { deleteCompanyPerson, listCompanyPeople } from "../../../api/key-people.api";
import { getCompanyPeopleColumns } from "./company-people.columns";
import CompanyPeopleModal from "./CompanyPeopleModal";

export default function CompanyPeoplePanel() {
	const companyId = useWatch<CompanyProfileFormValues, "companyId">({ name: "companyId" });

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [openModal, setOpenModal] = useState(false);
	const [selectedId, setSelectedId] = useState<number | null>(null);

	const refreshTable = () => actionRef.current?.reload?.();

	const baseColumns = useMemo(() => getCompanyPeopleColumns(), []);

	const columns: ProColumns<CompanyPersonDto>[] = useMemo(() => {
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
							setSelectedId(record.id);
							setOpenModal(true);
						}}
					>
						ویرایش
					</BasicButton>,
					<Popconfirm
						key="delete"
						title="حذف شود؟"
						okText="تایید"
						cancelText="انصراف"
						onConfirm={async () => {
							await deleteCompanyPerson(record.id);
							await (action as ProCoreActionType<object>)?.reload?.();
							window.$message?.success("حذف شد");
						}}
					>
						<BasicButton type="link" size="small">
							حذف
						</BasicButton>
					</Popconfirm>,
				],
			},
		];
	}, [baseColumns]);

	if (!companyId)
		return null;

	return (
		<BasicContent className="h-full">
			<BasicTable<CompanyPersonDto>
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
						role: (params as any).role,
						is_signatory: (params as any).is_signatory,
						ordering: (params as any).ordering,
					};

					const responseData = await listCompanyPeople(query as any);

					return {
						...responseData,
						data: responseData.results,
						total: responseData.count,
					};
				}}
				headerTitle="لیست اشخاص کلیدی"
				toolBarRender={() => [
					<Button
						key="add"
						icon={<PlusCircleOutlined />}
						type="primary"
						onClick={() => {
							setSelectedId(null);
							setOpenModal(true);
						}}
					>
						افزودن
					</Button>,
				]}
			/>

			<CompanyPeopleModal
				open={openModal}
				companyId={companyId}
				personId={selectedId}
				onClose={() => {
					setOpenModal(false);
					setSelectedId(null);
				}}
				onUpdated={refreshTable}
			/>
		</BasicContent>
	);
}
