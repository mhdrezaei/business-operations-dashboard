import type { CompanyDto } from "#src/api/common/common.types";
import type { PerformanceServicePath } from "#src/features/performance/api/performances.api";
import type { ActionType, ProColumns, ProFormInstance } from "@ant-design/pro-components";
import type { PerformanceListRow } from "../model/performance.list.types";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import {
	fetchMonthlyContractStatus,
	fetchSmsCommissionAgents,
	fetchUnregisteredPerformanceList,
} from "#src/features/performance/api/performances.api";
import { normalizePerformanceRecord, resolvePerformanceServicePath } from "#src/features/performance/shared/model/performance.helpers";
import {
	companiesByServiceQuery,
	servicesQuery,
	smsCommissionAgentsQuery,
} from "#src/features/performance/shared/queries/performance.queries";
import { useAccess } from "#src/hooks";
import { EditOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Button } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { PerformanceDetailModal } from "./components/PerformanceDetailModal";
import { getPerformanceColumns } from "./constants";

function isSmsCommissionServicePath(service: PerformanceServicePath | null) {
	return service === "sms-commission";
}

function serviceRequiresCompanyType(serviceCode: string | null | undefined) {
	const normalized = String(serviceCode ?? "").trim().toLowerCase();
	return normalized === "sms" || normalized === "psp" || normalized === "traffic";
}

function normalizeNumberList(values: unknown) {
	if (!Array.isArray(values))
		return [];

	const dedup = new Set<number>();
	values.forEach((item) => {
		const numeric = Number(item);
		if (Number.isInteger(numeric) && numeric > 0)
			dedup.add(numeric);
	});

	return Array.from(dedup);
}

function getRowValue(record: PerformanceListRow, keys: string[]) {
	for (const key of keys) {
		const value = (record as Record<string, unknown>)[key];
		if (value != null && value !== "")
			return value;
	}
	return "";
}

function getUnregisteredPerformanceRowKey(record: PerformanceListRow) {
	const id = getRowValue(record, ["id"]);
	if (id !== "")
		return String(id);

	return [
		getRowValue(record, ["service", "service_id", "service_code", "service_name"]),
		getRowValue(record, ["company", "company_id", "company_name"]),
		getRowValue(record, ["sh_year"]),
		getRowValue(record, ["sh_month"]),
		getRowValue(record, ["operation_type"]),
		getRowValue(record, ["operator"]),
		getRowValue(record, ["language"]),
		getRowValue(record, ["sales_agent", "sales_agent_id", "sales_agent_name"]),
		getRowValue(record, ["location"]),
		getRowValue(record, ["customer_nic", "customer_name"]),
	].map(value => String(value)).join("-");
}

export default function UnregisteredPerformanceList() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { hasDomainPermissionByServiceId, getPermittedCompanyTypes, getPermittedServiceIds } = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
	const [selectedServiceCode, setSelectedServiceCode] = useState<string | null>(null);
	const [openDetail, setOpenDetail] = useState(false);
	const [selectedRow, setSelectedRow] = useState<PerformanceListRow | null>(null);
	const [openingRowKey, setOpeningRowKey] = useState<string | null>(null);
	const applySelectedServicesState = useCallback((serviceIds: number[], serviceCode: string | null) => {
		setSelectedServiceIds(serviceIds);
		setSelectedServiceCode(serviceCode);
	}, []);

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
	const companyQueries = useQueries({
		queries: selectedServiceIds.map(serviceId => companiesByServiceQuery(serviceId)),
	});
	const selectedServiceId = selectedServiceIds.length === 1 ? selectedServiceIds[0] : null;
	const selectedServicePath = useMemo(
		() => resolvePerformanceServicePath(selectedServiceCode as any),
		[selectedServiceCode],
	);
	const selectedRowServicePath = useMemo(() => {
		const serviceCode = String(selectedRow?.service_code ?? selectedServiceCode ?? "").trim().toLowerCase();
		return resolvePerformanceServicePath(serviceCode as any);
	}, [selectedRow, selectedServiceCode]);

	const isSmsCommission = isSmsCommissionServicePath(selectedServicePath);
	const smsCommissionAgents = useQuery(smsCommissionAgentsQuery(isSmsCommission));
	const permittedCompanyTypeOptions = useMemo(
		() => serviceRequiresCompanyType(selectedServiceCode) && selectedServiceId
			? getPermittedCompanyTypes("performances", "view", selectedServiceId)
			: [],
		[selectedServiceCode, selectedServiceId, getPermittedCompanyTypes],
	);

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
		if (selectedServiceIds.length === 0)
			return;
		const nextServiceIds = selectedServiceIds.filter(serviceId => permittedViewServiceIds.has(serviceId));
		if (nextServiceIds.length === selectedServiceIds.length)
			return;

		if (nextServiceIds.length === 1) {
			const selected = serviceOptions.find(option => option.value === nextServiceIds[0]);
			applySelectedServicesState(nextServiceIds, selected?.code ?? null);
		}
		else {
			applySelectedServicesState(nextServiceIds, null);
		}
		formRef.current?.setFieldsValue({
			service_ids: nextServiceIds.length > 0 ? nextServiceIds : undefined,
			company_ids: undefined,
		});
	}, [selectedServiceIds, permittedViewServiceIdsList.join(","), serviceOptions, applySelectedServicesState]);

	const companyItems = useMemo<CompanyDto[]>(() => {
		const dedup = new Map<number, CompanyDto>();
		companyQueries.forEach((query) => {
			(query.data?.results ?? []).forEach((company) => {
				if (company.id != null && !dedup.has(company.id))
					dedup.set(company.id, company);
			});
		});
		return Array.from(dedup.values());
	}, [companyQueries]);

	const companyOptions = useMemo(
		() => companyItems.map(company => ({
			label: company.name,
			value: company.id,
		})),
		[companyItems],
	);
	const companiesLoading = companyQueries.some(query => query.isLoading);

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
			company_ids: undefined,
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

	const setSelectedServices = (serviceIds: number[], serviceCode: string | null) => {
		setSelectedServiceIds(serviceIds);
		setSelectedServiceCode(serviceCode);
		clearDependentFilters();
	};

	const canCreatePerformance = useMemo(() => {
		if (!selectedServiceId)
			return false;
		return hasDomainPermissionByServiceId("performances", "create", selectedServiceId) || hasDomainPermissionByServiceId("contracts", "create", selectedServiceId);
	}, [selectedServiceId, hasDomainPermissionByServiceId]);

	const refreshTable = () => {
		actionRef.current?.reload?.();
	};

	const openPerformanceDetail = useCallback(async (record: PerformanceListRow) => {
		const rowServiceCode = String((record as any).service_code ?? selectedServiceCode ?? "").trim().toLowerCase();
		const rowServicePath = resolvePerformanceServicePath(rowServiceCode as any);
		const rowKey = getUnregisteredPerformanceRowKey(record);

		if (rowServicePath !== "traffic") {
			if (rowServicePath === "sms-commission") {
				const normalized = normalizePerformanceRecord(record);
				if (normalized.companyId == null) {
					window.$message?.error(t("performance.errors.baseFormIncomplete"));
					return;
				}

				setOpeningRowKey(rowKey);
				try {
					const agents = await fetchSmsCommissionAgents();
					const selectedAgent = (agents.results ?? [])
						.find(agent => Number(agent.company) === Number(normalized.companyId));

					if (!selectedAgent) {
						window.$message?.error(t("performance.messages.salesAgentNotFound"));
						return;
					}

					setSelectedRow({
						...record,
						sales_agent: selectedAgent.id,
						sales_agent_id: selectedAgent.id,
						sales_agent_name: selectedAgent.name,
					});
					setOpenDetail(true);
				}
				catch {
					window.$message?.error(t("performance.messages.unknownError"));
				}
				finally {
					setOpeningRowKey(null);
				}
				return;
			}

			setSelectedRow(record);
			setOpenDetail(true);
			return;
		}

		const normalized = normalizePerformanceRecord(record);
		if (
			normalized.serviceId == null
			|| normalized.companyId == null
			|| normalized.year == null
			|| normalized.month == null
		) {
			window.$message?.error(t("performance.errors.baseFormIncomplete"));
			return;
		}

		setOpeningRowKey(rowKey);
		try {
			const status = await fetchMonthlyContractStatus({
				serviceId: normalized.serviceId,
				companyId: normalized.companyId,
				year: normalized.year,
				month: normalized.month,
				companyType: normalized.companyType,
			});

			setSelectedRow({
				...record,
				traffic: status.traffic ?? null,
				traffic_has_county_contract: status.traffic?.has_county_contract ?? null,
				traffic_location_units: status.traffic?.location_units ?? null,
			});
			setOpenDetail(true);
		}
		catch {
			window.$message?.error(t("performance.messages.unknownError"));
		}
		finally {
			setOpeningRowKey(null);
		}
	}, [selectedServiceCode, t]);

	const baseColumns = useMemo(
		() =>
			getPerformanceColumns({
				t,
				selectedServiceIds,
				selectedServiceCode,
				permittedCompanyTypeOptions,
				setSelectedServices,
				serviceOptions,
				companyOptions,
				isCompanyDisabled: selectedServiceIds.length === 0 || companiesLoading,
				companyPlaceholder: selectedServiceIds.length > 0 ? t("performance.placeholders.selectCompany") : t("performance.placeholders.selectServiceFirst"),
				salesAgentOptions,
			}),
		[
			t,
			selectedServiceIds,
			selectedServiceCode,
			permittedCompanyTypeOptions,
			serviceOptions,
			companyOptions,
			companiesLoading,
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
					const rowServiceId = Number((record as any).service ?? (record as any).service_id);
					const canCreateRow = Number.isInteger(rowServiceId) && (
						hasDomainPermissionByServiceId("performances", "create", rowServiceId, normalizePerformanceRecord(record).companyType)
						|| hasDomainPermissionByServiceId("contracts", "create", rowServiceId, normalizePerformanceRecord(record).companyType)
					);

					if (canCreateRow) {
						const rowKey = getUnregisteredPerformanceRowKey(record);
						actions.push(
							<BasicButton
								key="add"
								type="link"
								size="large"
								loading={openingRowKey === rowKey}
								title={t("performance.actions.submitPerformance")}
								icon={<EditOutlined />}
								onClick={() => void openPerformanceDetail(record)}
							/>,
						);
					}

					return actions;
				},
			},
		];
	}, [baseColumns, t, openingRowKey, openPerformanceDetail]);

	return (
		<BasicContent className="h-full">
			<BasicTable<PerformanceListRow>
				adaptive
				rowKey={getUnregisteredPerformanceRowKey}
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				request={async (params) => {
					const serviceIds = normalizeNumberList((params as any).service_ids);
					const effectiveServiceIds = serviceIds.length > 0 ? serviceIds : selectedServiceIds;

					if (effectiveServiceIds.length === 0) {
						return {
							data: [],
							total: 0,
							success: true,
						};
					}

					const companyIds = normalizeNumberList((params as any).company_ids);
					const query = {
						page: params.current ?? 1,
						page_size: params.pageSize ?? 10,
						search: (params as any).search,
						service_ids: effectiveServiceIds.join(","),
						company_ids: companyIds.length > 0 ? companyIds.join(",") : undefined,
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
				service={selectedRowServicePath}
				companies={companyItems}
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
