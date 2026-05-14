import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";

import type { ContractServicePath } from "../../api/contracts.api";
import type { ContractListItemType } from "../model/contracts.list.types";

import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { companiesByServiceQuery, servicesQuery } from "#src/features/contract/create/queries/contract.queries";
import { useAccess } from "#src/hooks";
import { DeleteOutlined, EditOutlined, FilePdfOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";

import { Button, Popconfirm } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { fetchContractDetail, fetchContractsList, fetchDeleteContract } from "../../api/contracts.api";
import { companyTypeMatches } from "../../shared/utils";
import { ContractDetailModal } from "./components/ContractDetailModal";
import { getContractColumns } from "./constants";
import { openContractPdfPrint } from "./utils/contract-pdf";

function parsePositiveInt(value: string | null) {
	if (!value)
		return null;
	const numeric = Number(value);
	return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

export default function ContractListPage() {
	const { t } = useTranslation();
	const {
		hasDomainPermission,
		hasDomainPermissionByServiceId,
		getPermittedCompanyTypes,
		getPermittedServiceIds,
	} = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [openDetail, setOpenDetail] = useState(false);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [selectedServicePath, setSelectedServicePath] = useState<ContractServicePath | null>(null);
	const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
	const [selectedTrafficCompanyType, setSelectedTrafficCompanyType] = useState<string | null>(null);
	const [downloadingPdfId, setDownloadingPdfId] = useState<number | null>(null);
	const [searchParams, setSearchParams] = useSearchParams();

	const deepLinkedContractId = parsePositiveInt(searchParams.get("contract_id"));
	const deepLinkedServiceId = parsePositiveInt(searchParams.get("service_id"));

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
			setSelectedServiceId(null);
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

		if (code === "sms-commission" || code === "sms_commission")
			return "sms-commission";

		if (code === "sms") {
			return row.sms_party === "client"
				? "sms/client"
				: "sms/vendor";
		}

		return "openapi";
	};

	const resolveServicePathByServiceId = (serviceId: number | null): ContractServicePath | null => {
		if (!serviceId)
			return null;

		const rawCode = serviceCodeById.get(serviceId) ?? null;
		const code = typeof rawCode === "string" ? rawCode.trim().toLowerCase() : null;

		if (code === "psp")
			return "psp";
		if (code === "traffic")
			return "traffic";
		if (code === "shahkar")
			return "shahkar";
		if (code === "commercial")
			return "commercial";
		if (code === "sms-commission" || code === "sms_commission")
			return "sms-commission";
		if (code === "sms")
			return "sms/client";
		if (code === "openapi")
			return "openapi";

		return null;
	};

	const selectedService = useMemo(() => {
		if (!selectedServiceId)
			return null;
		return services.data?.results?.find((x: any) => x.id === selectedServiceId) ?? null;
	}, [selectedServiceId, services.data]);

	const selectedServiceCode = typeof selectedService?.code === "string" ? selectedService.code.trim().toLowerCase() : null;
	const isTrafficService = selectedServiceCode === "traffic";
	const isSmsService = selectedServiceCode === "sms";
	const isCompanyTypeService = selectedServiceCode === "traffic" || selectedServiceCode === "sms" || selectedServiceCode === "psp";
	const permittedTrafficCompanyTypeOptions = useMemo(
		() => isCompanyTypeService ? getPermittedCompanyTypes("contracts", "view", selectedServiceId) : [],
		[isCompanyTypeService, selectedServiceId, getPermittedCompanyTypes],
	);

	useEffect(() => {
		if (!deepLinkedContractId || openDetail)
			return;

		const resolvedService = resolveServicePathByServiceId(deepLinkedServiceId);
		if (!resolvedService)
			return;

		setSelectedId(deepLinkedContractId);
		setSelectedServicePath(resolvedService);
		setOpenDetail(true);
	}, [deepLinkedContractId, deepLinkedServiceId, openDetail, serviceCodeById]);

	useEffect(() => {
		if (!isCompanyTypeService || !selectedTrafficCompanyType) {
			return;
		}
		if (permittedTrafficCompanyTypeOptions.some(item => item.key === selectedTrafficCompanyType)) {
			return;
		}

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
			? "ابتدا سرویس را انتخاب کنید"
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

	const refreshTable = () => actionRef.current?.reload?.();

	const canUpdateRow = (row: ContractListItemType) =>
		hasDomainPermissionByServiceId("contracts", "update", Number(row.service_id), row.traffic_company_type);
	const canDeleteRow = (row: ContractListItemType) =>
		hasDomainPermissionByServiceId("contracts", "delete", Number(row.service_id), row.traffic_company_type);

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
				width: 120,
				fixed: "right",
				align: "center",

				render: (_, record, __, action) => {
					const actions = [] as React.ReactNode[];

					if (canUpdateRow(record)) {
						actions.push(
							<BasicButton
								key="edit"
								type="link"
								size="large"
								title="ویرایش قرارداد"
								icon={<EditOutlined />}
								onClick={() => {
									setSelectedId(record.id);
									setSelectedServicePath(resolveServicePath(record));
									setOpenDetail(true);
								}}
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
								<BasicButton type="link" size="large" title="حذف قرارداد" icon={<DeleteOutlined />}>
								</BasicButton>
							</Popconfirm>,
						);
					}

					actions.push(
						<BasicButton
							key="pdf"
							type="link"
							size="large"
							title="دانلود PDF قرارداد"
							icon={<FilePdfOutlined />}
							loading={downloadingPdfId === record.id}
							onClick={() => handleDownloadPdf(record)}
						>

						</BasicButton>,
					);

					return actions;
				},
			},
		];
	}, [baseColumns, downloadingPdfId, t]);

	return (
		<BasicContent className="h-full">
			<BasicTable<ContractListItemType>
				adaptive
				rowKey="id"
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
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
							key="add"
							icon={<PlusCircleOutlined />}
							type="primary"
						>
							{t("common.add")}
						</Button>,
					];
				}}
			/>

			<ContractDetailModal
				open={openDetail}
				contractId={selectedId}
				service={selectedServicePath}
				onClose={() => {
					setOpenDetail(false);
					setSelectedId(null);
					setSelectedServicePath(null);

					if (searchParams.has("contract_id")) {
						const nextSearch = new URLSearchParams(searchParams);
						nextSearch.delete("contract_id");
						nextSearch.delete("service_id");
						setSearchParams(nextSearch, { replace: true });
					}
				}}
				onUpdated={refreshTable}
			/>
		</BasicContent>
	);
}
