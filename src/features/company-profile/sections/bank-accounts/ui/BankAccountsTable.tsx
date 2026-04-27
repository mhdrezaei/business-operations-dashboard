import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";
import type { BankAccountDto } from "../model/bank-accounts.types";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { useAccess } from "#src/hooks";
import { DeleteOutlined, EditOutlined, PlusCircleOutlined } from "@ant-design/icons";

import { Button, Popconfirm } from "antd";
import React, { useMemo, useRef, useState } from "react";
import { deleteBankAccount, listBankAccounts } from "../../../api/bank-accounts.api";
import { BANK_ACCOUNT_ORDERING_OPTIONS } from "../model/bank-accounts.constants";
import BankAccountModal from "./BankAccountModal";

interface Props {
	serviceId: number
	companyId: number
}

export default function BankAccountsTable({ serviceId, companyId }: Props) {
	const { hasDomainPermissionByServiceId } = useAccess();
	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [openModal, setOpenModal] = useState(false);
	const [editing, setEditing] = useState<BankAccountDto | null>(null);

	const canCreateBankAccount = hasDomainPermissionByServiceId("company_profile", "create", serviceId);
	const canUpdateBankAccount = hasDomainPermissionByServiceId("company_profile", "update", serviceId);
	const canDeleteBankAccount = hasDomainPermissionByServiceId("company_profile", "delete", serviceId);

	const refresh = () => actionRef.current?.reload?.();

	const handleDeleteRow = async (row: BankAccountDto, action?: ProCoreActionType<object>) => {
		if (!canDeleteBankAccount) {
			window.$message?.warning("دسترسی حذف حساب بانکی را ندارید.");
			return;
		}

		await deleteBankAccount(row.id);
		await action?.reload?.();
		window.$message?.success("با موفقیت حذف شد");
	};

	const columns: ProColumns<BankAccountDto>[] = useMemo(() => {
		return [
			{ dataIndex: "index", title: "ردیف", valueType: "indexBorder", width: 80 },
			{ title: "نام بانک", dataIndex: "bank_name", ellipsis: true, width: 180, search: false },
			{
				title: "شماره حساب",
				dataIndex: "account_number",
				ellipsis: true,
				width: 160,
				search: false,
				render: (_, row) => row.account_number || "-",
			},
			{
				title: "شماره شبا",
				dataIndex: "iban",
				ellipsis: true,
				width: 200,
				search: false,
				render: (_, row) => row.iban || "-",
			},
			{
				title: "شماره کارت",
				dataIndex: "card_number",
				ellipsis: true,
				width: 180,
				search: false,
				render: (_, row) => row.card_number || "-",
			},
			{
				title: "نام صاحب حساب",
				dataIndex: "account_holder_name",
				ellipsis: true,
				width: 200,
				search: false,
			},
			{
				title: "جستجو",
				dataIndex: "search",
				hideInTable: true,
				valueType: "text",
				fieldProps: { allowClear: true, placeholder: "جستجو..." },
			},
			{
				title: "نام بانک",
				dataIndex: "bank_name",
				hideInTable: true,
				valueType: "text",
				fieldProps: { allowClear: true, placeholder: "نام بانک" },
			},
			{
				title: "مرتب سازی",
				dataIndex: "ordering",
				hideInTable: true,
				valueType: "select",
				valueEnum: BANK_ACCOUNT_ORDERING_OPTIONS.reduce((acc, item) => {
					acc[item.value] = item.label;
					return acc;
				}, {} as Record<string, string>),
				fieldProps: { allowClear: true, placeholder: "مرتب سازی" },
			},
			{
				title: "عملیات",
				valueType: "option",
				key: "option",
				width: 140,
				fixed: "right",
				render: (_, record, __, action) => {
					const actions: React.ReactNode[] = [];

					if (canUpdateBankAccount) {
						actions.push(
							<BasicButton
								key="edit"
								type="link"
								size="large"
								title="ویرایش حساب"
								icon={<EditOutlined />}
								onClick={() => {
									setEditing(record);
									setOpenModal(true);
								}}
							/>,
						);
					}

					if (canDeleteBankAccount) {
						actions.push(
							<Popconfirm
								key="delete"
								title="حذف شود؟"
								okText="تایید"
								cancelText="انصراف"
								onConfirm={() => handleDeleteRow(record, action)}
							>
								<BasicButton type="link" icon={<DeleteOutlined />} size="large" title="حذف حساب" />
							</Popconfirm>,
						);
					}

					return actions;
				},
			},
		];
	}, [canDeleteBankAccount, canUpdateBankAccount]);

	return (
		<BasicContent className="h-full">
			<BasicTable<BankAccountDto>
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
						bank_name: (params as any).bank_name,
					};

					const responseData = await listBankAccounts(query as any);

					return {
						...responseData,
						data: responseData.results,
						total: responseData.count,
					};
				}}
				headerTitle="لیست حساب ها"
				toolBarRender={() => {
					if (!canCreateBankAccount) {
						return [];
					}
					return [
						<Button
							key="add"
							icon={<PlusCircleOutlined />}
							type="primary"
							onClick={() => {
								setEditing(null);
								setOpenModal(true);
							}}
						>
							افزودن حساب
						</Button>,
					];
				}}
			/>

			<BankAccountModal
				open={openModal}
				serviceId={serviceId}
				companyId={companyId}
				editing={editing}
				disabled={editing ? !canUpdateBankAccount : !canCreateBankAccount}
				onClose={() => {
					setOpenModal(false);
					setEditing(null);
				}}
				onSaved={refresh}
			/>
		</BasicContent>
	);
}
