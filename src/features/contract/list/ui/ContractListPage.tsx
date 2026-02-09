import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";
import type { ContractListItemType } from "../model/contracts.list.types";

import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { companiesByServiceQuery, servicesQuery } from "#src/features/contract/create/queries/contract.queries";
import { useAccess } from "#src/hooks";
import { PlusCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";

import { Button, Popconfirm } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchContractsList, fetchDeleteContract } from "../api/contracts.api";

import { ContractDetailModal } from "./components/ContractDetailModal";
import { getContractColumns } from "./constants";

type TrafficCompanyType = "CP" | "IXP" | "TCI" | "PREMIUM";

export default function ContractListPage() {
	const { t } = useTranslation();
	const { hasAccessByCodes } = useAccess();
	useEffect(() => {
		fetchContractsList({ page: 1, page_size: 20 })
			.then(console.warn)
			.catch(console.error);
	}, []);

	// ✅ دقیقا مثل الگوی پروژه (Menu)
	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [openDetail, setOpenDetail] = useState(false);
	const [selectedId, setSelectedId] = useState<number | null>(null);

	// ✅ فیلترهای وابسته
	const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
	const [selectedTrafficCompanyType, setSelectedTrafficCompanyType] = useState<TrafficCompanyType | null>(null);

	// ✅ سرویس‌ها مثل create
	const services = useQuery(servicesQuery());

	const selectedService = useMemo(() => {
		if (!selectedServiceId)
			return null;
		return services.data?.results?.find((x: any) => x.id === selectedServiceId) ?? null;
	}, [selectedServiceId, services.data]);

	const isTrafficService = selectedService?.code === "traffic";
	const isSmsService = selectedService?.code === "sms";

	// ✅ شرکت‌ها بر اساس service_id مثل create
	const companies = useQuery(companiesByServiceQuery(selectedServiceId));

	const serviceOptions = useMemo(
		() => (services.data?.results ?? []).map((s: any) => ({ label: s.name, value: s.id })),
		[services.data],
	);

	const companyOptions = useMemo(() => {
		const list = companies.data?.results ?? [];

		if (isTrafficService) {
			if (!selectedTrafficCompanyType)
				return [];
			return list
				.filter((c: any) => c.company_type === selectedTrafficCompanyType)
				.map((c: any) => ({ label: c.name, value: c.id }));
		}

		return list.map((c: any) => ({ label: c.name, value: c.id }));
	}, [companies.data, isTrafficService, selectedTrafficCompanyType]);

	const isCompanyDisabled
		= !selectedServiceId || companies.isLoading || (isTrafficService && !selectedTrafficCompanyType);

	const companyPlaceholder
		= !selectedServiceId
			? "ابتدا سرویس را انتخاب کنید"
			: companies.isLoading
				? "در حال دریافت لیست شرکت‌ها..."
				: isTrafficService && !selectedTrafficCompanyType
					? "ابتدا نوع شرکت (ترافیک) را انتخاب کنید"
					: "شرکت را انتخاب کنید";

	// ✅ با تغییر سرویس فقط فیلدهای وابسته پاک شوند
	const clearDependentFilters = () => {
		formRef.current?.setFieldsValue({
			company_id: undefined,
			company_type: undefined,
			is_official: undefined,
			sms_party: undefined,
		});
	};

	const refreshTable = () => actionRef.current?.reload?.();

	const handleDeleteRow = async (id: number, action?: ProCoreActionType<object>) => {
		await fetchDeleteContract(id);
		await action?.reload?.();
		window.$message?.success(t("common.deleteSuccess"));
	};

	const baseColumns = useMemo(
		() =>
			getContractColumns({
				t,
				selectedServiceId,
				setSelectedServiceId: (v) => {
					setSelectedServiceId(v);

					// ✅ مثل create
					setSelectedTrafficCompanyType(null);

					// ✅ پاک کردن وابسته‌ها
					clearDependentFilters();

					// ✅ reload
					actionRef.current?.reload?.();
				},
				isTrafficService: !!isTrafficService,
				isSmsService: !!isSmsService,
				selectedTrafficCompanyType,
				setSelectedTrafficCompanyType: (v) => {
					setSelectedTrafficCompanyType(v);

					// ✅ مثل create: وقتی نوع شرکت traffic عوض شد، company_id پاک شود
					formRef.current?.setFieldsValue({ company_id: undefined });

					// ✅ reload
					actionRef.current?.reload?.();
				},
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
			isSmsService,
			selectedTrafficCompanyType,
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
				render: (_, record, __, action) => [
					<BasicButton
						key="edit"
						type="link"
						size="small"
						// disabled={!hasAccessByCodes(accessControlCodes.update)}
						onClick={() => {
							setSelectedId(record.id);
							setOpenDetail(true);
						}}
					>
						{t("common.edit")}
					</BasicButton>,
					<Popconfirm
						key="delete"
						title={t("common.confirmDelete")}
						okText={t("common.confirm")}
						cancelText={t("common.cancel")}
						onConfirm={() => handleDeleteRow(record.id, action)}
					>
						<BasicButton
							type="link"
							size="small"
							// disabled={!hasAccessByCodes(accessControlCodes.delete)}
						>
							{t("common.delete")}
						</BasicButton>
					</Popconfirm>,
				],
			},
		];
	}, [baseColumns, hasAccessByCodes, t]);

	return (
		<BasicContent className="h-full">
			<BasicTable<ContractListItemType>
				adaptive
				rowKey="id"
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				request={async (params) => {
					// ✅ کلیدها مطابق swagger
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

					// ✅ مهم: BasicTable در پروژه شما مثل Menu انتظار پاسخ استاندارد دارد
					const responseData = await fetchContractsList(query as any);

					return {
						...responseData,
						data: responseData.results,
						total: responseData.count,
					};
				}}
				headerTitle={t("contract.tableTitle.listTitle")}
				toolBarRender={() => [
					<Button
						key="add"
						icon={<PlusCircleOutlined />}
						type="primary"
						// disabled={!hasAccessByCodes(accessControlCodes.add)}
						onClick={() => {
							// navigate("/contracts/create")
						}}
					>
						{t("common.add")}
					</Button>,
				]}
			/>

			<ContractDetailModal
				open={openDetail}
				contractId={selectedId}
				onClose={() => {
					setOpenDetail(false);
					setSelectedId(null);
				}}
				onUpdated={refreshTable}
			/>
		</BasicContent>
	);
}
