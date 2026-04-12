import type { PerformanceServicePath } from "#src/features/performance/api/performances.api";
import type { ActionType, ProColumns, ProFormInstance } from "@ant-design/pro-components";
import type { PerformanceListRow } from "../model/performance.list.types";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import {
	fetchUnregisteredPerformanceList,
} from "#src/features/performance/api/performances.api";
import { resolvePerformanceServicePath } from "#src/features/performance/shared/model/performance.helpers";
import {
	companiesByServiceQuery,
	servicesQuery,
	smsCommissionAgentsQuery,
} from "#src/features/performance/shared/queries/performance.queries";
import { useAccess } from "#src/hooks";
import { FileAddOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { PerformanceDetailModal } from "./components/PerformanceDetailModal";
import { getPerformanceColumns } from "./constants";

function isSmsCommissionServicePath(service: PerformanceServicePath | null) {
	return service === "sms-commission";
}

export default function UnregisteredPerformanceList() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { hasDomainPermissionByServiceId, getPermittedServiceIds } = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
	const [selectedServiceCode, setSelectedServiceCode] = useState<string | null>(null);
	const [openDetail, setOpenDetail] = useState(false);
	const [selectedRow, setSelectedRow] = useState<PerformanceListRow | null>(null);

	const permittedViewIdsFromPerformances = getPermittedServiceIds("performances", "view");
	const permittedViewIdsFromContracts = getPermittedServiceIds("contracts", "view");
	const permittedViewServiceIdsList = permittedViewIdsFromPerformances.length > 0
		? permittedViewIdsFromPerformances
		: permittedViewIdsFromContracts;

	const permittedViewServiceIds = useMemo(
		() => new Set(permittedViewServiceIdsList),
		[permittedViewServiceIdsList.join(",")],
	);

	const services = useQuery(servicesQuery());
	const companies = useQuery(companiesByServiceQuery(selectedServiceId));
	const selectedServicePath = useMemo(
		() => resolvePerformanceServicePath(selectedServiceCode as any),
		[selectedServiceCode],
	);

	const isSmsCommission = isSmsCommissionServicePath(selectedServicePath);
	const smsCommissionAgents = useQuery(smsCommissionAgentsQuery(isSmsCommission));

	const serviceOptions = useMemo(() => {
		return (services.data?.results ?? [])
			.filter(service => permittedViewServiceIds.has(Number(service.id)))
			.map(service => ({
				label: service.name,
				value: service.id,
				code: String(service.code ?? "").trim().toLowerCase(),
			}));
	}, [services.data, permittedViewServiceIdsList.join(",")]);

	useEffect(() => {
		if (!selectedServiceId)
			return;
		if (permittedViewServiceIds.has(selectedServiceId))
			return;

		setSelectedServiceId(null);
		setSelectedServiceCode(null);
		formRef.current?.setFieldsValue({
			service: undefined,
			company: undefined,
		});
	}, [selectedServiceId, permittedViewServiceIdsList.join(",")]);

	const companyOptions = useMemo(
		() => (companies.data?.results ?? []).map(company => ({
			label: company.name,
			value: company.id,
		})),
		[companies.data],
	);

	const salesAgentOptions = useMemo(() => {
		const all = smsCommissionAgents.data?.results ?? [];
		return all
			.map(agent => ({
				label: agent.name,
				value: agent.id,
			}));
	}, [smsCommissionAgents.data]);

	const clearDependentFilters = () => {
		formRef.current?.setFieldsValue({
			company: undefined,
			search: undefined,
			sh_year: undefined,
			sh_month: undefined,
			ordering: undefined,
			gr_month_start_after: undefined,
			gr_month_start_before: undefined,
			operation_type: undefined,
			operator: undefined,
			language: undefined,
			sales_agent: undefined,
			location: undefined,
			company_type: undefined,
			is_official: undefined,
			customer_name: undefined,
			customer_nic: undefined,
			province_code: undefined,
			service_type: undefined,
		});
	};

	const setSelectedService = (serviceId: number | null, serviceCode: string | null) => {
		setSelectedServiceId(serviceId);
		setSelectedServiceCode(serviceCode);
		clearDependentFilters();
		actionRef.current?.reload?.();
	};

	const canCreatePerformance = useMemo(() => {
		if (!selectedServiceId)
			return false;
		return hasDomainPermissionByServiceId("performances", "create", selectedServiceId) || hasDomainPermissionByServiceId("contracts", "create", selectedServiceId);
	}, [selectedServiceId, hasDomainPermissionByServiceId]);

	const refreshTable = () => {
		actionRef.current?.reload?.();
	};

	const baseColumns = useMemo(
		() =>
			getPerformanceColumns({
				t,
				selectedServiceId,
				selectedServiceCode,
				setSelectedService,
				serviceOptions,
				companyOptions,
				isCompanyDisabled: !selectedServiceId || companies.isLoading,
				companyPlaceholder: selectedServiceId ? t("performance.placeholders.selectCompany") : t("performance.placeholders.selectServiceFirst"),
				salesAgentOptions,
			}),
		[
			t,
			selectedServiceId,
			selectedServiceCode,
			serviceOptions,
			companyOptions,
			companies.isLoading,
			salesAgentOptions,
		],
	);

	const columns: ProColumns<PerformanceListRow>[] = useMemo(() => {
		return [
			...baseColumns,
			{
				title: t("common.action"),
				valueType: "option",
				key: "option",
				width: 120,
				fixed: "right",
				align: "center",
				render: (_, record, __) => {
					const actions: React.ReactNode[] = [];

					if (canCreatePerformance) {
						actions.push(
							<BasicButton
								key="add"
								type="link"
								size="large"
								title={t("performance.actions.editPerformance")}
								icon={<FileAddOutlined />}
								onClick={() => {
									setSelectedRow(record);
									setOpenDetail(true);
								}}
							/>,
						);
					}

					return actions;
				},
			},
		];
	}, [baseColumns, t]);

	return (
		<BasicContent className="h-full">
			<BasicTable<PerformanceListRow>
				adaptive
				rowKey={record => String(record.id ?? `${record.company}-${record.sh_year}-${record.sh_month}-${record.operation_type ?? ""}-${record.operator ?? ""}-${record.language ?? ""}`)}
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				request={async (params) => {
					if (!selectedServicePath || !selectedServiceId) {
						return {
							data: [],
							total: 0,
							success: true,
						};
					}

					const query = {
						page: params.current ?? 1,
						page_size: params.pageSize ?? 20,
						search: (params as any).search,
						service_ids: selectedServiceId,
						company: (params as any).company,
						sh_year: (params as any).sh_year,
						sh_month: (params as any).sh_month,
						ordering: (params as any).ordering,
						gr_month_start_after: (params as any).gr_month_start_after,
						gr_month_start_before: (params as any).gr_month_start_before,
						operation_type: (params as any).operation_type,
						operator: (params as any).operator,
						language: (params as any).language,
						sales_agent: (params as any).sales_agent,
						location: (params as any).location,
						company_type: (params as any).company_type,
						is_official: (params as any).is_official,
						customer_name: (params as any).customer_name,
						customer_nic: (params as any).customer_nic,
						province_code: (params as any).province_code,
						service_type: (params as any).service_type,
					};

					const responseData = await fetchUnregisteredPerformanceList(query);
					return {
						data: responseData.results,
						total: responseData.count,
						success: true,
					};
				}}
				headerTitle={t("performance.titles.performanceList")}
				toolBarRender={() => {
					if (!canCreatePerformance) {
						return [];
					}
					return [
						<Button
							key="add"
							icon={<PlusCircleOutlined />}
							type="primary"
							onClick={() => navigate("/performances/new")}
						>
							{t("common.add")}
						</Button>,
					];
				}}
			/>

			<PerformanceDetailModal
				open={openDetail}
				service={selectedServicePath}
				companies={companies.data?.results}
				record={selectedRow}
				onClose={() => {
					setOpenDetail(false);
					setSelectedRow(null);
				}}
				onUpdated={refreshTable}
			/>
		</BasicContent>
	);
}
