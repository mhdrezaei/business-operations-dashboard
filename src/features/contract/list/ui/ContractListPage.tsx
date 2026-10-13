import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";

import type { ContractServicePath } from "../../api/contracts.api";
import type { ContractListItemType } from "../model/contracts.list.types";

import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { companiesByServiceQuery, servicesQuery } from "#src/features/contract/create/queries/contract.queries";
import { useAccess } from "#src/hooks";
import { TableActionDownloadIcon, TableActionEditIcon, TableActionEyeIcon, TableActionTrashIcon } from "#src/icons";
import { PlusCircleOutlined, PrinterOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";

import { Button, Popconfirm, theme } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { checkOfficialPdfStatus, fetchContractDetail, fetchContractsList, fetchDeleteContract, fetchSignFlowPreview } from "../../api/contracts.api";
import { companyTypeMatches, pickCompanyTypeToken } from "../../shared/utils";
import { useContractAddendaTableStyles } from "./components/contract-addenda-table.styles";
import { ContractAddendaExpandedRow } from "./components/ContractAddendaExpandedRow";
import { ContractTemplatePrintModal } from "./components/ContractTemplatePrintModal";
import { SignFlowPreviewModal } from "./components/SignFlowPreviewModal";
import { getContractColumns } from "./constants";
import { openContractPdfPrint } from "./utils/contract-pdf";

export default function ContractListPage() {
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const addendaTableClasses = useContractAddendaTableStyles();
	const {
		hasDomainPermission,
		hasDomainPermissionByServiceId,
		getPermittedCompanyTypes,
		getPermittedServiceIds,
	} = useAccess();
	const navigate = useNavigate();
	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);
	const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
	const [selectedTrafficCompanyType, setSelectedTrafficCompanyType] = useState<string | null>(null);
	const [downloadingPdfId, setDownloadingPdfId] = useState<number | null>(null);
	const [printModalOpen, setPrintModalOpen] = useState(false);
	const [printRecord, setPrintRecord] = useState<ContractListItemType | null>(null);
	const [printAddendumGroupId, setPrintAddendumGroupId] = useState<string | null>(null);
	const [signFlowModalOpen, setSignFlowModalOpen] = useState(false);
	const [signFlowLoading, setSignFlowLoading] = useState(false);
	const [signFlowData, setSignFlowData] = useState<any>(null);

	const canCreateContracts = hasDomainPermission("contracts", "create");
	const permittedViewServiceIdList = getPermittedServiceIds("contracts", "view");
	const permittedViewServiceIds = useMemo(
		() => new Set(permittedViewServiceIdList),
		[permittedViewServiceIdList.join(",")],
	);

	const services = useQuery(servicesQuery());

	useEffect(() => {
		if (!selectedServiceId) {
			return;
		}
		if (!permittedViewServiceIds.has(selectedServiceId)) {
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setSelectedServiceId(null);
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setSelectedTrafficCompanyType(null);
			formRef.current?.setFieldsValue({
				service_id: undefined,
				company_id: undefined,
				company_type: undefined,
				is_official: undefined,
				sms_party: undefined,
			});
		}
	}, [selectedServiceId, permittedViewServiceIdList.join(",")]);

	const serviceCodeById = useMemo(() => {
		const m = new Map<number, string>();
		(services.data?.results ?? []).forEach((s: any) => {
			const id = Number(s?.id);
			const code = typeof s?.code === "string" ? s.code : null;
			if (Number.isFinite(id) && code)
				m.set(id, code);
		});
		return m;
	}, [services.data]);

	const resolveServicePath = (row: ContractListItemType): ContractServicePath => {
		const rawCode = serviceCodeById.get(Number(row.service_id)) ?? null;
		const code = typeof rawCode === "string" ? rawCode.trim().toLowerCase() : null;
		if (code === "psp")
			return "psp";

		if (code === "traffic")
			return "traffic";

		if (code === "shahkar")
			return "shahkar";

		if (code === "commercial")
			return "commercial";
		if (code === "sales_agency" || code === "sales-agency") {
			return pickCompanyTypeToken(row.company_type) === "SALES_REP_MANAGEMENT"
				? "sales-agency/rep-management"
				: "sales-agency/outbound";
		}

		if (code === "sms-commission" || code === "sms_commission")
			return "sms-commission";

		if (code === "sms") {
			return row.sms_party === "client"
				? "sms/client"
				: "sms/vendor";
		}

		return "openapi";
	};

	const selectedService = useMemo(() => {
		if (!selectedServiceId)
			return null;
		return services.data?.results?.find((x: any) => x.id === selectedServiceId) ?? null;
	}, [selectedServiceId, services.data]);

	const selectedServiceCode = typeof selectedService?.code === "string" ? selectedService.code.trim().toLowerCase() : null;
	const isTrafficService = selectedServiceCode === "traffic";
	const isSmsService = selectedServiceCode === "sms";
	const isCompanyTypeService = selectedServiceCode === "traffic" || selectedServiceCode === "sms" || selectedServiceCode === "psp" || selectedServiceCode === "sales_agency" || selectedServiceCode === "sales-agency";
	const permittedTrafficCompanyTypeOptions = useMemo(
		() => isCompanyTypeService ? getPermittedCompanyTypes("contracts", "view", selectedServiceId) : [],
		[isCompanyTypeService, selectedServiceId, getPermittedCompanyTypes],
	);

	useEffect(() => {
		if (!isCompanyTypeService || !selectedTrafficCompanyType) {
			return;
		}
		if (permittedTrafficCompanyTypeOptions.some(item => item.key === selectedTrafficCompanyType)) {
			return;
		}

		// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
		setSelectedTrafficCompanyType(null);
		formRef.current?.setFieldsValue({
			company_type: undefined,
			company_id: undefined,
		});
	}, [isCompanyTypeService, selectedTrafficCompanyType, permittedTrafficCompanyTypeOptions]);

	const companies = useQuery(companiesByServiceQuery(selectedServiceId));

	const serviceOptions = useMemo(
		() =>
			(services.data?.results ?? [])
				.filter((service: any) => permittedViewServiceIds.has(Number(service.id)))
				.map((service: any) => ({ label: service.name, value: service.id })),
		[services.data, permittedViewServiceIdList.join(",")],
	);

	const companyOptions = useMemo(() => {
		const list = companies.data?.results ?? [];

		if (isCompanyTypeService) {
			if (!selectedTrafficCompanyType)
				return [];
			return list
				.filter((c: any) => companyTypeMatches(c.company_type, selectedTrafficCompanyType))
				.map((c: any) => ({ label: c.name, value: c.id }));
		}

		return list.map((c: any) => ({ label: c.name, value: c.id }));
	}, [companies.data, isCompanyTypeService, selectedTrafficCompanyType]);

	const isCompanyDisabled
		= !selectedServiceId || companies.isLoading || (isCompanyTypeService && !selectedTrafficCompanyType);

	const companyPlaceholder
		= !selectedServiceId
			? "ابتدا نوع سرویس را انتخاب کنید"
			: companies.isLoading
				? "در حال دریافت لیست شرکت‌ها..."
				: isCompanyTypeService && !selectedTrafficCompanyType
					? "ابتدا نوع شرکت را انتخاب کنید"
					: "شرکت را انتخاب کنید";

	const clearDependentFilters = () => {
		formRef.current?.setFieldsValue({
			company_id: undefined,
			company_type: undefined,
			is_official: undefined,
			sms_party: undefined,
		});
	};
	const getRowCompanyType = (row: ContractListItemType) =>
		pickCompanyTypeToken((row as any).traffic_company_type ?? (row as any).company_type);

	const canUpdateRow = (row: ContractListItemType) =>
		hasDomainPermissionByServiceId("contracts", "update", Number(row.service_id), getRowCompanyType(row));
	const canDeleteRow = (row: ContractListItemType) =>
		hasDomainPermissionByServiceId("contracts", "delete", Number(row.service_id), getRowCompanyType(row));

	const handleDeleteRow = async (row: ContractListItemType, action?: ProCoreActionType<object>) => {
		if (!canDeleteRow(row)) {
			window.$message?.warning("دسترسی حذف قرارداد ندارید.");
			return;
		}
		await fetchDeleteContract(resolveServicePath(row), row.id);
		await action?.reload?.();
		window.$message?.success(t("common.deleteSuccess"));
	};

	const handleDownloadPdf = async (row: ContractListItemType) => {
		setDownloadingPdfId(row.id);
		try {
			const detail = await fetchContractDetail(resolveServicePath(row), row.id);
			openContractPdfPrint({ record: row, detail });
		}
		catch (error: any) {
			if (error?.message === "POPUP_BLOCKED") {
				window.$message?.error("پاپ‌آپ مرورگر مسدود است. لطفا آن را فعال کنید.");
				return;
			}
			window.$message?.error("دریافت فایل قرارداد ناموفق بود.");
		}
		finally {
			setDownloadingPdfId(null);
		}
	};

	const baseColumns = useMemo(
		() =>
			getContractColumns({
				t,
				selectedServiceId,
				setSelectedServiceId: (v) => {
					setSelectedServiceId(v);
					setSelectedTrafficCompanyType(null);
					clearDependentFilters();
					actionRef.current?.reload?.();
				},
				isTrafficService: !!isTrafficService,
				isCompanyTypeService: !!isCompanyTypeService,
				isSmsService: !!isSmsService,
				selectedTrafficCompanyType,
				setSelectedTrafficCompanyType: (v) => {
					setSelectedTrafficCompanyType(v);
					formRef.current?.setFieldsValue({ company_id: undefined });
					actionRef.current?.reload?.();
				},
				permittedTrafficCompanyTypeOptions,
				serviceOptions,
				companyOptions,
				isCompanyDisabled,
				companyPlaceholder,
				onServiceFilterChange: clearDependentFilters,
			}),
		[
			t,
			selectedServiceId,
			isTrafficService,
			isCompanyTypeService,
			isSmsService,
			selectedTrafficCompanyType,
			permittedTrafficCompanyTypeOptions,
			serviceOptions,
			companyOptions,
			isCompanyDisabled,
			companyPlaceholder,
		],
	);

	const columns: ProColumns<ContractListItemType>[] = useMemo(() => {
		return [
			...baseColumns,
			{
				title: t("common.action"),
				valueType: "option",
				key: "option",
				width: 160,
				fixed: "right",
				align: "center",

				render: (_, record, __, action) => {
					const actions = [] as React.ReactNode[];
					const service = resolveServicePath(record);
					const companyType = getRowCompanyType(record) ?? "";

					if (canUpdateRow(record)) {
						actions.push(
							<BasicButton
								key="edit"
								type="link"
								size="large"
								title="ویرایش قرارداد"
								icon={<TableActionEditIcon />}
								onClick={() => {
									navigate(`/contracts/${record.id}/edit?service=${encodeURIComponent(service)}&serviceId=${record.service_id}&companyType=${encodeURIComponent(companyType)}`);
								}}
							/>,
						);
					}

					actions.push(
						<BasicButton
							key="preview"
							type="link"
							size="large"
							title="پیش‌نمایش قرارداد"
							icon={<TableActionEyeIcon />}
							onClick={() => navigate(`/contracts/${record.id}/preview?service=${encodeURIComponent(service)}&serviceId=${record.service_id}&companyType=${encodeURIComponent(companyType)}`)}
						/>,
					);

					actions.push(
						<BasicButton
							key="pdf"
							type="link"
							size="large"
							title="دانلود PDF قرارداد"
							icon={<TableActionDownloadIcon />}
							loading={downloadingPdfId === record.id}
							onClick={() => handleDownloadPdf(record)}
						>

						</BasicButton>,
					);

					actions.push(
						<BasicButton
							key="print"
							type="link"
							size="large"
							title="چاپ قرارداد"
							icon={<PrinterOutlined />}
							onClick={async () => {
								try {
									const status = await checkOfficialPdfStatus(resolveServicePath(record), record.id);
									if (!status.can_upload && status.has_official_pdf) {
										window.$message?.warning("نسخه رسمی این قرارداد قبلا آپلود شده و در حال گرفتن تایید می باشد");
										return;
									}
								}
								catch (error) {
									console.error(error);
									window.$message?.error("خطا در بررسی وضعیت نسخه رسمی");
									return;
								}
								setPrintRecord(record);
								setPrintAddendumGroupId(null);
								setSignFlowLoading(true);
								setSignFlowModalOpen(true);
								try {
									const data = await fetchSignFlowPreview(resolveServicePath(record), record.id);
									setSignFlowData(data);
								}
								catch (err) {
									console.error(err);
									window.$message?.error("خطا در دریافت اطلاعات گردش کار");
									setSignFlowModalOpen(false);
								}
								finally {
									setSignFlowLoading(false);
								}
							}}
						/>,
					);

					if (canDeleteRow(record)) {
						actions.push(
							<Popconfirm
								key="delete"
								title={t("common.confirmDelete")}
								okText={t("common.confirm")}
								cancelText={t("common.cancel")}
								onConfirm={() => handleDeleteRow(record, action)}
							>
								<BasicButton type="link" size="large" title="حذف قرارداد" icon={<TableActionTrashIcon />}>
								</BasicButton>
							</Popconfirm>,
						);
					}

					return actions;
				},
			},
		];
	}, [baseColumns, downloadingPdfId, t]);

	return (
		<BasicContent className="h-full">
			<BasicTable<ContractListItemType>
				rootClassName={addendaTableClasses.contractTable}
				filterTitle="جستجوی قرارداد"
				filterSubtitle="برای جستجو، فیلتر و مرتب‌سازی قراردادها، نوع سرویس و شرکت را انتخاب کنید."
				tableSubtitle="قراردادهای ثبت شده را مشاهده و مدیریت کنید. برای ایجاد قرارداد جدید، از کلید ایجاد قرارداد جدید استفاده کنید."
				rowKey="id"
				columns={columns}
				expandable={{
					columnWidth: token.controlHeight,
					rowExpandable: record => Number(record.addenda_count) > 0,
					expandedRowRender: record => (
						<ContractAddendaExpandedRow
							contract={record}
							service={resolveServicePath(record)}
							onPrint={async (addendumGroupId) => {
								try {
									const status = await checkOfficialPdfStatus(resolveServicePath(record), record.id, addendumGroupId);
									if (!status.can_upload && status.has_official_pdf) {
										window.$message?.warning("نسخه رسمی این قرارداد قبلا آپلود شده و در حال گرفتن تایید می باشد");
										return;
									}
								}
								catch (error) {
									console.error(error);
									window.$message?.error("خطا در بررسی وضعیت نسخه رسمی");
									return;
								}
								setPrintRecord(record);
								setPrintAddendumGroupId(addendumGroupId);
								setSignFlowLoading(true);
								setSignFlowModalOpen(true);
								try {
									const data = await fetchSignFlowPreview(resolveServicePath(record), record.id, addendumGroupId);
									setSignFlowData(data);
								}
								catch (err) {
									console.error(err);
									window.$message?.error("خطا در دریافت اطلاعات گردش کار");
									setSignFlowModalOpen(false);
								}
								finally {
									setSignFlowLoading(false);
								}
							}}
						/>
					),
				}}
				actionRef={actionRef}
				formRef={formRef}
				search={{
					defaultCollapsed: false,
				}}

				onReset={() => {
					formRef.current?.resetFields();
					setSelectedServiceId(null);
					setSelectedTrafficCompanyType(null);
					clearDependentFilters();
					actionRef.current?.reload?.();
				}}

				request={async (params) => {
					const query = {
						page: params.current ?? 1,
						page_size: params.pageSize ?? 20,
						search: (params as any).search,
						service_id: (params as any).service_id,
						company_id: (params as any).company_id,
						company_type: (params as any).company_type,
						is_official: (params as any).is_official,
						sms_party: (params as any).sms_party,
						ordering: (params as any).ordering,
					};

					const responseData = await fetchContractsList(query as any);

					return {
						...responseData,
						data: responseData.results,
						total: responseData.count,
					};
				}}
				headerTitle={t("contract.tableTitle.listTitle")}
				toolBarRender={() => {
					if (!canCreateContracts) {
						return [];
					}
					return [
						<Button
							key="addNewContract"
							icon={<PlusCircleOutlined />}
							type="primary"
							onClick={() => navigate("/contracts/new")}
						>
							{t("common.addNewContract")}
						</Button>,
					];
				}}
			/>
			<SignFlowPreviewModal
				open={signFlowModalOpen}
				onClose={() => setSignFlowModalOpen(false)}
				loading={signFlowLoading}
				data={signFlowData}
				onStart={() => {
					setSignFlowModalOpen(false);
					setPrintModalOpen(true);
				}}
			/>
			<ContractTemplatePrintModal
				open={printModalOpen}
				onClose={() => {
					setPrintModalOpen(false);
					setPrintRecord(null);
					setPrintAddendumGroupId(null);
				}}
				record={printRecord}
				addendumGroupId={printAddendumGroupId}
				service={printRecord ? resolveServicePath(printRecord) : null}
				companyType={printRecord ? getRowCompanyType(printRecord) : null}
			/>
		</BasicContent>
	);
}
