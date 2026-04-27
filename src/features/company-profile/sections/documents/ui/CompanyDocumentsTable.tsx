import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";
import type { CompanyDocumentDto } from "../model/company-documents.types";

import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { useAccess } from "#src/hooks";
import { PlusCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Popconfirm, Tag } from "antd";
import React, { useMemo, useRef, useState } from "react";

import {
	createCompanyDocument,
	deleteCompanyDocument,
	listCompanyDocuments,
	updateCompanyDocument,
} from "../../../api/documents.api";
import { companyDocumentDetailQuery } from "../../../queries/company-documents.queries";

import {
	DOC_TYPE_OPTIONS,
	ORDERING_OPTIONS,
	VERIFICATION_STATUS_OPTIONS,
} from "../model/company-documents.constants";

import {
	companyDocumentFormToFormData,
	dtoToCompanyDocumentForm,
	emptyCompanyDocumentValues,
} from "../model/company-documents.mappers";

import CompanyDocumentsModal from "./CompanyDocumentsModal";

interface Props {
	serviceId: number
	companyId: number
}

export default function CompanyDocumentsTable({ serviceId, companyId }: Props) {
	const { hasCompanyCardAccess, hasDomainPermissionByServiceId } = useAccess();
	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [openModal, setOpenModal] = useState(false);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [saving, setSaving] = useState(false);

	const canAccessDocumentsCard = hasCompanyCardAccess("company_documents");
	const canCreateDocument = hasDomainPermissionByServiceId("company_profile", "create", serviceId);
	const canUpdateDocument = hasDomainPermissionByServiceId("company_profile", "update", serviceId);
	const canDeleteDocument = hasDomainPermissionByServiceId("company_profile", "delete", serviceId);

	const detail = useQuery(companyDocumentDetailQuery(selectedId));

	const refreshTable = () => actionRef.current?.reload?.();

	const closeModal = () => {
		setOpenModal(false);
		setSelectedId(null);
	};

	const modalTitle = selectedId ? "ویرایش مدرک" : "ثبت مدرک";

	const initialValues = useMemo(() => {
		if (!selectedId)
			return emptyCompanyDocumentValues;

		const dto = detail.data;
		return dto ? dtoToCompanyDocumentForm(dto) : emptyCompanyDocumentValues;
	}, [detail.data, selectedId]);

	const handleDeleteRow = async (row: CompanyDocumentDto, action?: ProCoreActionType<object>) => {
		if (!canDeleteDocument) {
			window.$message?.warning("دسترسی حذف برای این بخش ندارید.");
			return;
		}
		await deleteCompanyDocument(row.id);
		await action?.reload?.();
		window.$message?.success("حذف شد");
	};

	const docTypeValueEnum = useMemo(() => {
		return DOC_TYPE_OPTIONS.reduce((acc, it) => {
			acc[it.value] = it.label;
			return acc;
		}, {} as Record<string, string>);
	}, []);

	const verificationValueEnum = useMemo(() => {
		return VERIFICATION_STATUS_OPTIONS.reduce((acc, it) => {
			acc[it.value] = it.label;
			return acc;
		}, {} as Record<string, string>);
	}, []);

	const orderingValueEnum = useMemo(() => {
		return ORDERING_OPTIONS.reduce((acc, it) => {
			acc[it.value] = it.label;
			return acc;
		}, {} as Record<string, string>);
	}, []);

	const columns: ProColumns<CompanyDocumentDto>[] = useMemo(() => {
		return [
			{
				dataIndex: "index",
				title: "ردیف",
				valueType: "indexBorder",
				width: 80,
			},

			{
				title: "نوع مدرک",
				dataIndex: "doc_type",
				width: 220,
				search: false,
				render: (_, r) => docTypeValueEnum[r.doc_type] ?? r.doc_type ?? "-",
			},
			{
				title: "وضعیت تایید",
				dataIndex: "verification_status",
				width: 160,
				search: false,
				render: (_, r) => <Tag>{verificationValueEnum[r.verification_status] ?? r.verification_status}</Tag>,
			},
			{
				title: "نام فایل",
				dataIndex: "original_filename",
				ellipsis: true,
				width: 260,
				search: false,
				render: (_, r) => r.original_filename ?? "-",
			},
			{
				title: "حجم",
				dataIndex: "size",
				width: 120,
				search: false,
				render: (_, r) => (r.size == null ? "-" : `${r.size}`),
			},
			{
				title: "اعتبار از",
				dataIndex: "valid_from",
				valueType: "date",
				width: 140,
				search: false,
			},
			{
				title: "اعتبار تا",
				dataIndex: "valid_until",
				valueType: "date",
				width: 140,
				search: false,
			},

			{
				title: "نوع مدرک",
				dataIndex: "doc_type",
				valueType: "select",
				hideInTable: true,
				valueEnum: docTypeValueEnum,
				fieldProps: { allowClear: true, placeholder: "انتخاب کنید" },
			},
			{
				title: "وضعیت تایید",
				dataIndex: "verification_status",
				valueType: "select",
				hideInTable: true,
				valueEnum: verificationValueEnum,
				fieldProps: { allowClear: true, placeholder: "انتخاب کنید" },
			},
			{
				title: "جستجو",
				dataIndex: "search",
				hideInTable: true,
				valueType: "text",
				fieldProps: { allowClear: true, placeholder: "عبارت جستجو..." },
			},
			{
				title: "مرتب‌سازی",
				dataIndex: "ordering",
				hideInTable: true,
				valueType: "select",
				valueEnum: orderingValueEnum,
				fieldProps: { allowClear: true, placeholder: "انتخاب کنید" },
			},

			{
				title: "عملیات",
				valueType: "option",
				key: "option",
				width: 140,
				fixed: "right",
				render: (_, record, __, action) => {
					const actions = [] as React.ReactNode[];
					if (canUpdateDocument) {
						actions.push(
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
						);
					}
					if (canDeleteDocument) {
						actions.push(
							<Popconfirm
								key="delete"
								title="حذف شود؟"
								okText="بله"
								cancelText="خیر"
								onConfirm={() => handleDeleteRow(record, action)}
							>
								<BasicButton type="link" size="small">
									حذف
								</BasicButton>
							</Popconfirm>,
						);
					}
					return actions;
				},
			},
		];
	}, [canDeleteDocument, canUpdateDocument, docTypeValueEnum, orderingValueEnum, verificationValueEnum]);

	if (!canAccessDocumentsCard) {
		return <div className="opacity-80">کارت مدارک برای این کاربر فعال نیست.</div>;
	}

	return (
		<BasicContent className="h-full">
			<BasicTable<CompanyDocumentDto>
				adaptive
				rowKey="id"
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				request={async (params) => {
					const query = {
						page: params.current ?? 1,
						page_size: params.pageSize ?? 20,

						company: companyId,
						search: (params as any).search,
						doc_type: (params as any).doc_type,
						verification_status: (params as any).verification_status,
						ordering: (params as any).ordering,
					};

					const responseData = await listCompanyDocuments(query as any);

					return {
						...responseData,
						data: responseData.results,
						total: responseData.count,
					};
				}}
				headerTitle="مدارک شرکت"
				toolBarRender={() => {
					if (!canCreateDocument) {
						return [];
					}
					return [
						<Button
							key="add"
							icon={<PlusCircleOutlined />}
							type="primary"
							onClick={() => {
								setSelectedId(null);
								setOpenModal(true);
							}}
						>
							ثبت مدرک
						</Button>,
					];
				}}
			/>

			<CompanyDocumentsModal
				open={openModal}
				loading={!!selectedId && detail.isLoading}
				title={modalTitle}
				defaultValues={initialValues}
				disabled={saving}
				onClose={closeModal}
				onSubmit={async (values) => {
					if (selectedId && !canUpdateDocument) {
						window.$message?.warning("دسترسی ویرایش برای این بخش ندارید.");
						return;
					}
					if (!selectedId && !canCreateDocument) {
						window.$message?.warning("دسترسی ایجاد برای این بخش ندارید.");
						return;
					}
					setSaving(true);
					try {
						const fd = companyDocumentFormToFormData({
							serviceId,
							companyId,
							values,
							keepFileIfNull: true,
						});

						if (selectedId) {
							await updateCompanyDocument(selectedId, fd);
							window.$message?.success("ذخیره شد");
						}
						else {
							await createCompanyDocument(fd);
							window.$message?.success("ثبت شد");
						}

						refreshTable();
						closeModal();
					}
					catch (error) {
						window.$message?.error("در حال حاضر مشکلی وجود دارد");
						console.error(error);
					}
					finally {
						setSaving(false);
					}
				}}
			/>
		</BasicContent>
	);
}
