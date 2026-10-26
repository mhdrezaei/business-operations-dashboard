import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";

import type { ContractServicePath } from "../../api/contracts.api";
import type { ContractCreateRouteState } from "../../shared/utils/contract-routes";
import type { ContractListFormParams } from "../model/contract-list";
import type { ContractListItemType } from "../model/contracts.list.types";

import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { sortToOrdering } from "#src/components/basic-table/sort";
import { companiesByServiceQuery, servicesQuery } from "#src/features/contract/shared/queries/contract.queries";
import { useAccess } from "#src/hooks";
import { TableActionDownloadIcon, TableActionEditIcon, TableActionEyeIcon, TableActionTrashIcon } from "#src/icons";
import { ExclamationCircleOutlined, PlusCircleOutlined, PrinterOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";

import { App, Button, Modal, Popconfirm, theme } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { checkOfficialPdfStatus, fetchContractDetail, fetchContractPrintData, fetchContractsList, fetchDeleteContract, fetchSignFlowPreview } from "../../api/contracts.api";
import { isTelecomFrameCode } from "../../shared/services/telecom-frame/telecom-frame.types";
import { companyTypeMatches, pickCompanyTypeToken } from "../../shared/utils";
import { buildContractEditPath } from "../../shared/utils/contract-routes";
import {
	CONTRACT_LIST_DEFAULT_PAGE_SIZE,
	CONTRACT_LIST_PAGE_SIZE_OPTIONS,
	CONTRACT_LIST_SORT_ALIASES,
	getContractPdfBlockReason,
	resolveListServicePath,
	toContractListQuery,
} from "../model/contract-list";
import { useContractAddendaTableStyles } from "./components/contract-addenda-table.styles";
import { ContractAddendaExpandedRow } from "./components/ContractAddendaExpandedRow";
import { ContractTemplatePrintModal } from "./components/ContractTemplatePrintModal";
import { SignFlowPreviewModal } from "./components/SignFlowPreviewModal";
import { getContractColumns } from "./constants";
import { openContractPdfPrint } from "./utils/contract-pdf";

function extractSignFlowId(realSignFlow: any): number | string | null {
	if (realSignFlow === null || realSignFlow === undefined || realSignFlow === false) {
		return null;
	}
	if (typeof realSignFlow === "number" || typeof realSignFlow === "string") {
		return realSignFlow;
	}
	if (typeof realSignFlow === "object") {
		const candidate = realSignFlow.id ?? realSignFlow.sign_flow_id ?? realSignFlow.flow_id;
		if (candidate !== null && candidate !== undefined && candidate !== "") {
			return candidate;
		}
	}
	return null;
}

export default function ContractListPage() {
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const { modal } = App.useApp();
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
	const [selectedSmsParty, setSelectedSmsParty] = useState<"vendor" | "client" | null>(null);
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

	const resolveServicePath = (row: ContractListItemType): ContractServicePath =>
		resolveListServicePath(row, serviceCodeById.get(Number(row.service_id)));

	const selectedService = useMemo(() => {
		if (!selectedServiceId)
			return null;
		return services.data?.results?.find((x: any) => x.id === selectedServiceId) ?? null;
	}, [selectedServiceId, services.data]);

	const selectedServiceCode = typeof selectedService?.code === "string" ? selectedService.code.trim().toLowerCase() : null;
	const isTrafficService = selectedServiceCode === "traffic";
	const isSmsService = selectedServiceCode === "sms";
	const isCompanyTypeService = selectedServiceCode === "traffic" || selectedServiceCode === "sms" || selectedServiceCode === "psp" || selectedServiceCode === "sales_agency" || selectedServiceCode === "sales-agency";
	const hasServiceOfKind = (matches: (code: string) => boolean) =>
		(services.data?.results ?? []).some((service: any) => matches(String(service?.code ?? "").trim().toLowerCase()));
	// Old: with a service selected only that service decides, otherwise any visible service of that kind does.
	const showCompanyTypeColumn = selectedServiceId
		? isCompanyTypeService || isTelecomFrameCode(selectedServiceCode)
		: hasServiceOfKind(code => ["traffic", "sms", "psp", "sales_agency", "sales-agency"].includes(code) || isTelecomFrameCode(code));
	const showOfficialColumn = selectedServiceId
		? isTrafficService || isSmsService
		: hasServiceOfKind(code => code === "traffic" || code === "sms");
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
	}, [isCompanyTypeService, isSmsService, selectedSmsParty, selectedTrafficCompanyType, permittedTrafficCompanyTypeOptions]);

	const companies = useQuery(companiesByServiceQuery(selectedServiceId, { includeInternal: true }));

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
		= !selectedServiceId || companies.isLoading || (isCompanyTypeService && !selectedTrafficCompanyType) || (isSmsService && selectedSmsParty === "vendor");

	const companyPlaceholder
		= !selectedServiceId
			? t("contract.companyPlaceholder.selectServiceFirst")
			: companies.isLoading
				? t("contract.companyPlaceholder.loading")
				: isCompanyTypeService && !selectedTrafficCompanyType
					? t("contract.companyPlaceholder.selectCompanyTypeFirst")
					: t("contract.companyPlaceholder.select");

	const clearDependentFilters = () => {
		setSelectedSmsParty(null);
		formRef.current?.setFieldsValue({
			company_id: undefined,
			company_type: undefined,
			is_official: undefined,
			sms_party: undefined,
		});
	};
	const getRowCompanyType = (row: ContractListItemType) => pickCompanyTypeToken(row.company_type);

	// Single-option filters are picked automatically (old behaviour); the form is re-submitted to apply them.
	const autoSelectFilter = (values: Record<string, unknown>) => {
		formRef.current?.setFieldsValue(values);
		formRef.current?.submit();
	};

	useEffect(() => {
		if (!selectedServiceId && serviceOptions.length === 1) {
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setSelectedServiceId(Number(serviceOptions[0].value));
			autoSelectFilter({ service_id: serviceOptions[0].value });
		}
	}, [selectedServiceId, serviceOptions]);

	useEffect(() => {
		if (isCompanyTypeService && !(isSmsService && selectedSmsParty === "vendor") && !selectedTrafficCompanyType && permittedTrafficCompanyTypeOptions.length === 1) {
			const [only] = permittedTrafficCompanyTypeOptions;
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setSelectedTrafficCompanyType(only.key);
			autoSelectFilter({ company_type: only.key });
		}
	}, [isCompanyTypeService, isSmsService, selectedSmsParty, selectedTrafficCompanyType, permittedTrafficCompanyTypeOptions]);

	useEffect(() => {
		if (!isCompanyDisabled && companyOptions.length === 1 && !formRef.current?.getFieldValue("company_id"))
			autoSelectFilter({ company_id: companyOptions[0].value });
	}, [isCompanyDisabled, companyOptions]);

	const canViewRow = (row: ContractListItemType) =>
		hasDomainPermissionByServiceId("contracts", "view", Number(row.service_id), getRowCompanyType(row));
	const canUpdateRow = (row: ContractListItemType) =>
		hasDomainPermissionByServiceId("contracts", "update", Number(row.service_id), getRowCompanyType(row));
	const canDeleteRow = (row: ContractListItemType) =>
		hasDomainPermissionByServiceId("contracts", "delete", Number(row.service_id), getRowCompanyType(row));
	const canCreateRow = (row: ContractListItemType) =>
		hasDomainPermissionByServiceId("contracts", "create", Number(row.service_id), getRowCompanyType(row));
	const canSignRow = (row: ContractListItemType) =>
		hasDomainPermissionByServiceId("contracts", "sign", Number(row.service_id), getRowCompanyType(row))
		|| hasDomainPermissionByServiceId("contracts", "update", Number(row.service_id), getRowCompanyType(row));

	const handleDeleteRow = async (row: ContractListItemType, action?: ProCoreActionType<object>) => {
		if (!canDeleteRow(row)) {
			window.$message?.warning(t("contract.list.message.noDeleteAccess"));
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
				window.$message?.error(t("contract.list.message.popupBlocked"));
				return;
			}
			window.$message?.error(t("contract.list.message.downloadFailed"));
		}
		finally {
			setDownloadingPdfId(null);
		}
	};

	const showActiveSignFlowModal = (signFlowId: number | string | null) => {
		const confirmFn = modal?.confirm ?? window.$modal?.confirm ?? Modal.confirm;
		confirmFn({
			title: t("contract.list.activeSignFlow.title"),
			icon: <ExclamationCircleOutlined />,
			content: t("contract.list.activeSignFlow.content"),
			okText: t("contract.list.activeSignFlow.ok"),
			cancelText: t("common.cancel"),
			onOk: () => {
				if (signFlowId !== null && signFlowId !== undefined) {
					navigate(`/contracts/sign-flows/${signFlowId}`);
				}
				else {
					navigate("/contracts/sign-flows");
				}
			},
		});
	};

	const handleSignFlowClick = async (record: ContractListItemType, addendumGroupId?: string | null) => {
		try {
			const service = resolveServicePath(record);
			const printData = await fetchContractPrintData(service, record.id, addendumGroupId);
			const activeSignFlow = printData?.real_sign_flow;

			if (activeSignFlow !== null && activeSignFlow !== undefined) {
				const signFlowId = extractSignFlowId(activeSignFlow);
				showActiveSignFlowModal(signFlowId);
				return;
			}

			const status = await checkOfficialPdfStatus(service, record.id, addendumGroupId);
			if (status?.real_sign_flow !== null && status?.real_sign_flow !== undefined) {
				const signFlowId = extractSignFlowId(status.real_sign_flow);
				showActiveSignFlowModal(signFlowId);
				return;
			}

			if (!status.can_upload && status.has_official_pdf) {
				window.$message?.warning(t("contract.list.message.officialUploaded"));
				return;
			}
		}
		catch (error) {
			console.error(error);
			window.$message?.error(t("contract.list.message.officialStatusFailed"));
			return;
		}

		setPrintRecord(record);
		setPrintAddendumGroupId(addendumGroupId ?? null);
		setSignFlowLoading(true);
		setSignFlowModalOpen(true);
		try {
			const data = await fetchSignFlowPreview(resolveServicePath(record), record.id, addendumGroupId);
			const previewActiveSignFlow = data?.real_sign_flow;
			const previewSignFlowId = extractSignFlowId(previewActiveSignFlow)
			  ?? (data?.has_active_flow && data?.active_flow_id ? data.active_flow_id : null);

			if (previewActiveSignFlow != null) {
				setSignFlowModalOpen(false);
				showActiveSignFlowModal(previewSignFlowId);
				return;
			}

			if (data?.has_active_flow && data?.active_flow_id) {
				setSignFlowModalOpen(false);
				showActiveSignFlowModal(data.active_flow_id);
				return;
			}

			setSignFlowData(data);
		}
		catch (err) {
			console.error(err);
			window.$message?.error(t("contract.list.message.signFlowFailed"));
			setSignFlowModalOpen(false);
		}
		finally {
			setSignFlowLoading(false);
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
				selectedSmsParty,
				setSelectedSmsParty: (v) => {
					setSelectedSmsParty(v);
					setSelectedTrafficCompanyType(null);
					formRef.current?.setFieldsValue({ company_type: undefined, company_id: undefined });
				},
				showCompanyTypeColumn,
				showOfficialColumn,
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
			selectedSmsParty,
			showCompanyTypeColumn,
			showOfficialColumn,
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

					const pdfBlockReason = getContractPdfBlockReason(service, record.is_official);

					if (canCreateRow(record)) {
						const isSmsVendorRow = service === "sms/vendor";
						actions.push(
							<BasicButton
								key="create"
								type="link"
								size="large"
								title={t("contract.list.actions.createFromRow")}
								icon={<PlusCircleOutlined />}
								onClick={() => navigate("/contracts/new", {
									state: {
										serviceId: record.service_id,
										companyId: isSmsVendorRow ? null : record.company_id,
										companyType: companyType || null,
										counterpartyType: isSmsVendorRow ? "gov_ops" : service === "sms/client" ? "partners" : null,
									} satisfies ContractCreateRouteState,
								})}
							/>,
						);
					}

					if (canUpdateRow(record)) {
						actions.push(
							<BasicButton
								key="edit"
								type="link"
								size="large"
								title={t("contract.list.actions.edit")}
								icon={<TableActionEditIcon />}
								onClick={() => {
									navigate(buildContractEditPath({ contractId: record.id, service, serviceId: record.service_id, companyType }));
								}}
							/>,
						);
					}

					if (canViewRow(record)) {
						actions.push(
							<BasicButton
								key="preview"
								type="link"
								size="large"
								title={t("contract.list.actions.preview")}
								icon={<TableActionEyeIcon />}
								onClick={() => navigate(`/contracts/${record.id}/preview?service=${encodeURIComponent(service)}&serviceId=${record.service_id}&companyType=${encodeURIComponent(companyType)}`)}
							/>,
						);

						actions.push(
							<BasicButton
								key="pdf"
								type="link"
								size="large"
								title={pdfBlockReason ? t(`contract.list.pdfDisabled.${pdfBlockReason}`) : t("contract.list.actions.downloadPdf")}
								icon={<TableActionDownloadIcon />}
								disabled={pdfBlockReason !== null}
								loading={downloadingPdfId === record.id}
								onClick={() => handleDownloadPdf(record)}
							/>,
						);
					}

					if (canSignRow(record)) {
						actions.push(
							<BasicButton
								key="print"
								type="link"
								size="large"
								title={t("contract.list.actions.print")}
								icon={<PrinterOutlined />}
								onClick={() => handleSignFlowClick(record)}
							/>,
						);
					}

					if (canDeleteRow(record)) {
						actions.push(
							<Popconfirm
								key="delete"
								title={t("common.confirmDelete")}
								okText={t("common.confirm")}
								cancelText={t("common.cancel")}
								onConfirm={() => handleDeleteRow(record, action)}
							>
								<BasicButton type="link" size="large" title={t("contract.edit.delete")} icon={<TableActionTrashIcon />}>
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
				filterTitle={t("contract.list.page.filterTitle")}
				filterSubtitle={t("contract.list.page.filterSubtitle")}
				tableSubtitle={t("contract.list.page.tableSubtitle")}
				rowKey="id"
				columns={columns}
				expandable={{
					columnWidth: token.controlHeight,
					rowExpandable: record => Number(record.addenda_count) > 0,
					expandedRowRender: record => (
						<ContractAddendaExpandedRow
							contract={record}
							service={resolveServicePath(record)}
							onPrint={canSignRow(record) ? addendumGroupId => handleSignFlowClick(record, addendumGroupId) : undefined}
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

				request={async (params, sort) => {
					const responseData = await fetchContractsList(
						toContractListQuery(params as ContractListFormParams, sortToOrdering(sort, CONTRACT_LIST_SORT_ALIASES)),
					);

					return {
						...responseData,
						data: responseData.results,
						total: responseData.count,
					};
				}}
				pagination={{ defaultPageSize: CONTRACT_LIST_DEFAULT_PAGE_SIZE, pageSizeOptions: CONTRACT_LIST_PAGE_SIZE_OPTIONS }}
				columnsState={{ persistenceKey: "contract-list-columns", persistenceType: "localStorage" }}
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
				onSuccess={(signFlowId) => {
					setPrintModalOpen(false);
					setPrintRecord(null);
					setPrintAddendumGroupId(null);
					actionRef.current?.reload?.();
					if (signFlowId) {
						navigate(`/contracts/sign-flows/${signFlowId}`);
					}
					else {
						navigate("/contracts/sign-flows");
					}
				}}
				record={printRecord}
				addendumGroupId={printAddendumGroupId}
				service={printRecord ? resolveServicePath(printRecord) : null}
				companyType={printRecord ? getRowCompanyType(printRecord) : null}
			/>
		</BasicContent>
	);
}
