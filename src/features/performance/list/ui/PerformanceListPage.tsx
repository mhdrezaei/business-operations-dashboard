import type { PerformanceServicePath } from "#src/features/performance/api/performances.api";
import type { ActionType, ProColumns, ProCoreActionType, ProFormInstance } from "@ant-design/pro-components";
import type { PerformanceListRow } from "../model/performance.list.types";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import {
	deletePerformanceByComposite,
	deletePerformanceById,
	deleteSmsCommissionPerformanceByComposite,
	fetchPerformanceList,
} from "#src/features/performance/api/performances.api";
import {
	aggregatePerformanceRows,
	buildMonthsByYearMap,
	companyTypeMatches,
	normalizePerformanceRecord,
	resolvePerformanceServicePath,
	shouldAggregatePerformanceRows,
} from "#src/features/performance/shared/model/performance.helpers";
import {
	companiesByServiceQuery,
	performanceGapsQuery,
	servicesQuery,
	smsCommissionAgentsQuery,
} from "#src/features/performance/shared/queries/performance.queries";
import { useAccess } from "#src/hooks";
import { DeleteOutlined, EditOutlined, FileExcelOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Popconfirm } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { PerformanceDetailModal } from "./components/PerformanceDetailModal";
import { TrafficUpdateTemplateModal } from "./components/TrafficUpdateTemplateModal";
import { getPerformanceColumns } from "./constants";

function isSmsCommissionServicePath(service: PerformanceServicePath | null) {
	return service === "sms-commission";
}

function isCompositeDeleteService(service: PerformanceServicePath | null) {
	return service === "openapi" || service === "sms";
}

function serviceRequiresCompanyType(serviceCode: string | null | undefined) {
	const normalized = String(serviceCode ?? "").trim().toLowerCase();
	return normalized === "sms" || normalized === "psp" || normalized === "traffic";
}

export default function PerformanceListPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const { hasDomainPermissionByServiceId, getPermittedCompanyTypes, getPermittedServiceIds } = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);
	const openedDirectEditRef = useRef(false);

	const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
	const [selectedServiceCode, setSelectedServiceCode] = useState<string | null>(null);
	const [selectedCompanyType, setSelectedCompanyType] = useState<string | null>(null);
	const [openDetail, setOpenDetail] = useState(false);
	const [openUpdateTemplate, setOpenUpdateTemplate] = useState(false);
	const [selectedYear, setSelectedYear] = useState<number | null>(null);
	const [selectedRow, setSelectedRow] = useState<PerformanceListRow | null>(null);
	const [deletingRowId, setDeletingRowId] = useState<number | null>(null);
	const directEdit = (location.state as {
		directEdit?: {
			service: PerformanceServicePath
			serviceCode: string | null
			serviceId: number | null
			record: PerformanceListRow
		}
	} | null)?.directEdit;
	const resetInvalidSelectedService = useCallback(() => {
		setSelectedServiceId(null);
		setSelectedServiceCode(null);
		setSelectedCompanyType(null);
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
	const companies = useQuery(companiesByServiceQuery(selectedServiceId));
	const selectedServicePath = useMemo(
		() => resolvePerformanceServicePath(selectedServiceCode as any),
		[selectedServiceCode],
	);
	const requiresCompanyType = serviceRequiresCompanyType(selectedServiceCode);
	const isTraffic = selectedServicePath === "traffic";

	useEffect(() => {
		if (!directEdit || openedDirectEditRef.current)
			return;

		openedDirectEditRef.current = true;
		setSelectedServiceId(directEdit.serviceId);
		setSelectedServiceCode(directEdit.serviceCode);
		setSelectedCompanyType(normalizePerformanceRecord(directEdit.record).companyType);
		setSelectedRow(directEdit.record);
		setOpenDetail(true);
	}, [directEdit]);

	const closePerformanceDetail = () => {
		setOpenDetail(false);
		setSelectedRow(null);
		if (directEdit)
			navigate("/performances/edit", { replace: true, state: null });
	};

	const isSmsCommission = isSmsCommissionServicePath(selectedServicePath);
	const smsCommissionAgents = useQuery(smsCommissionAgentsQuery(isSmsCommission));
	const gaps = useQuery(performanceGapsQuery({
		serviceId: isTraffic ? selectedServiceId : null,
		companyId: null,
		companyType: isTraffic ? selectedCompanyType : null,
	}));
	const performanceMonthsByYear = useMemo(
		() => buildMonthsByYearMap(gaps.data?.performance_months_by_year),
		[gaps.data],
	);
	const periodOptionsLoading = isTraffic && !!selectedCompanyType && (gaps.isLoading || gaps.isFetching);
	const permittedCompanyTypeOptions = useMemo(
		() => requiresCompanyType
			? getPermittedCompanyTypes("performances", "view", selectedServiceId)
			: [],
		[requiresCompanyType, selectedServiceId, getPermittedCompanyTypes],
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
		if (!selectedServiceId)
			return;
		if (permittedViewServiceIds.has(selectedServiceId))
			return;

		resetInvalidSelectedService();
		formRef.current?.setFieldsValue({
			service: undefined,
			company: undefined,
			company_type: undefined,
		});
	}, [selectedServiceId, permittedViewServiceIdsList.join(","), resetInvalidSelectedService]);

	useEffect(() => {
		if (!requiresCompanyType || !selectedCompanyType) {
			return;
		}
		if (permittedCompanyTypeOptions.some(item => item.key === selectedCompanyType)) {
			return;
		}

		setSelectedCompanyType(null);
		formRef.current?.setFieldsValue({
			company_type: undefined,
			company: undefined,
		});
	}, [requiresCompanyType, selectedCompanyType, permittedCompanyTypeOptions]);

	const allCompanyOptions = useMemo(
		() => (companies.data?.results ?? []).map(company => ({
			label: company.name,
			value: company.id,
		})),
		[companies.data],
	);

	const companyOptions = useMemo(
		() => {
			const allCompanies = companies.data?.results ?? [];
			const filteredCompanies = requiresCompanyType
				? selectedCompanyType
					? allCompanies.filter(company => companyTypeMatches(company.company_type, selectedCompanyType))
					: []
				: allCompanies;

			return filteredCompanies.map(company => ({
				label: company.name,
				value: company.id,
			}));
		},
		[companies.data, requiresCompanyType, selectedCompanyType],
	);

	const updateTemplateCompanyTypeOptions = useMemo(
		() => permittedCompanyTypeOptions.map(option => ({
			label: option.value,
			value: option.key,
		})),
		[permittedCompanyTypeOptions],
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
		setSelectedCompanyType(null);
		setSelectedYear(null);
		clearDependentFilters();
	};

	const canCreatePerformance = useMemo(() => {
		if (!selectedServiceId)
			return false;
		return hasDomainPermissionByServiceId("performances", "create", selectedServiceId, selectedCompanyType) || hasDomainPermissionByServiceId("contracts", "create", selectedServiceId, selectedCompanyType);
	}, [selectedServiceId, selectedCompanyType, hasDomainPermissionByServiceId]);

	const canUpdateRow = (row: PerformanceListRow) => {
		const normalized = normalizePerformanceRecord(row);
		const serviceId = normalized.serviceId ?? selectedServiceId;
		if (!serviceId)
			return false;
		const companyType = normalized.companyType ?? selectedCompanyType;
		return hasDomainPermissionByServiceId("performances", "update", serviceId, companyType) || hasDomainPermissionByServiceId("contracts", "update", serviceId, companyType);
	};

	const canDeleteRow = (row: PerformanceListRow) => {
		const normalized = normalizePerformanceRecord(row);
		const serviceId = normalized.serviceId ?? selectedServiceId;
		if (!serviceId)
			return false;
		const companyType = normalized.companyType ?? selectedCompanyType;
		return hasDomainPermissionByServiceId("performances", "delete", serviceId, companyType) || hasDomainPermissionByServiceId("contracts", "delete", serviceId, companyType);
	};

	const handleDeleteRow = async (row: PerformanceListRow, action?: ProCoreActionType<object>) => {
		if (!selectedServicePath) {
			window.$message?.warning(t("performance.messages.selectServiceFirst"));
			return;
		}
		if (!canDeleteRow(row)) {
			window.$message?.warning(t("performance.messages.noDeleteAccess"));
			return;
		}

		const normalized = normalizePerformanceRecord(row);
		const rowId = normalized.id;
		setDeletingRowId(rowId ?? null);

		try {
			if (selectedServicePath === "sms-commission") {
				if (
					normalized.companyId == null
					|| normalized.salesAgentId == null
					|| normalized.year == null
					|| normalized.month == null
				) {
					throw new Error(t("performance.errors.deleteCompositeKeyIncomplete"));
				}
				await deleteSmsCommissionPerformanceByComposite(
					normalized.companyId,
					normalized.salesAgentId,
					normalized.year,
					normalized.month,
				);
			}
			else if (isCompositeDeleteService(selectedServicePath)) {
				if (
					normalized.companyId == null
					|| normalized.year == null
					|| normalized.month == null
				) {
					throw new Error(t("performance.errors.deleteCompositeKeyIncomplete"));
				}
				await deletePerformanceByComposite(
					selectedServicePath,
					normalized.companyId,
					normalized.year,
					normalized.month,
				);
			}
			else if (normalized.id != null) {
				await deletePerformanceById(selectedServicePath, normalized.id);
			}
			else if (
				normalized.companyId != null
				&& normalized.year != null
				&& normalized.month != null
			) {
				await deletePerformanceByComposite(
					selectedServicePath,
					normalized.companyId,
					normalized.year,
					normalized.month,
				);
			}
			else {
				throw new Error(t("performance.errors.deleteUniqueKeyNotFound"));
			}

			await action?.reload?.();
			window.$message?.success(t("common.deleteSuccess"));
		}
		finally {
			setDeletingRowId(null);
		}
	};

	const refreshTable = () => {
		actionRef.current?.reload?.();
	};

	const baseColumns = useMemo(
		() =>
			getPerformanceColumns({
				t,
				selectedServiceId,
				selectedServiceCode,
				selectedCompanyType,
				permittedCompanyTypeOptions,
				setSelectedService,
				serviceOptions,
				companyOptions,
				allCompanyOptions,
				isCompanyDisabled: !selectedServiceId || companies.isLoading || (requiresCompanyType && !selectedCompanyType),
				companyPlaceholder: !selectedServiceId
					? t("performance.placeholders.selectServiceFirst")
					: requiresCompanyType && !selectedCompanyType
						? t("performance.placeholders.selectCompanyTypeFirst")
						: t("performance.placeholders.selectCompany"),
				salesAgentOptions,
				performanceMonthsByYear,
				selectedYear,
				periodOptionsLoading,
			}),
		[
			t,
			selectedServiceId,
			selectedServiceCode,
			selectedCompanyType,
			permittedCompanyTypeOptions,
			serviceOptions,
			companyOptions,
			allCompanyOptions,
			companies.isLoading,
			salesAgentOptions,
			requiresCompanyType,
			performanceMonthsByYear,
			selectedYear,
			periodOptionsLoading,
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
				render: (_, record, __, action) => {
					const actions: React.ReactNode[] = [];

					if (canUpdateRow(record)) {
						actions.push(
							<BasicButton
								key="edit"
								type="link"
								size="large"
								title={t("performance.actions.editPerformance")}
								icon={<EditOutlined />}
								onClick={() => {
									setSelectedRow(record);
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
								<BasicButton
									type="link"
									size="large"
									title={t("performance.actions.deletePerformance")}
									icon={<DeleteOutlined />}
									loading={deletingRowId != null && normalizePerformanceRecord(record).id === deletingRowId}
								/>
							</Popconfirm>,
						);
					}

					return actions;
				},
			},
		];
	}, [baseColumns, deletingRowId, t]);

	return (
		<BasicContent className="h-full">
			<BasicTable<PerformanceListRow>
				adaptive
				rowKey={record => String(record.id ?? `${record.company}-${record.sh_year}-${record.sh_month}-${record.operation_type ?? ""}-${record.operator ?? ""}-${record.language ?? ""}`)}
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				form={{
					onValuesChange: (changedValues) => {
						if (Object.prototype.hasOwnProperty.call(changedValues, "company_type")) {
							const nextCompanyType = changedValues.company_type == null ? null : String(changedValues.company_type);
							setSelectedCompanyType(nextCompanyType);
							setSelectedYear(null);
							formRef.current?.setFieldsValue({ company: undefined, sh_year: undefined, sh_month: undefined });
						}
						if (Object.prototype.hasOwnProperty.call(changedValues, "sh_year")) {
							const nextYear = changedValues.sh_year == null ? null : Number(changedValues.sh_year);
							setSelectedYear(Number.isFinite(nextYear as number) ? nextYear : null);
							formRef.current?.setFieldsValue({ sh_month: undefined });
						}
					},
				}}
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
						service: selectedServiceId,
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

					if (!shouldAggregatePerformanceRows(selectedServicePath)) {
						const responseData = await fetchPerformanceList(selectedServicePath, query);
						return {
							data: responseData.results,
							total: responseData.count,
							success: true,
						};
					}

					const rawRows: PerformanceListRow[] = [];
					const aggregatePageSize = 250;
					let currentPage = 1;
					let totalRawRows = 0;

					do {
						const responseData = await fetchPerformanceList(selectedServicePath, {
							...query,
							page: currentPage,
							page_size: aggregatePageSize,
						});
						totalRawRows = responseData.count ?? 0;
						rawRows.push(...responseData.results);
						currentPage += 1;
					}
					while (rawRows.length < totalRawRows);

					const aggregatedRows = aggregatePerformanceRows(selectedServicePath, rawRows);
					const current = params.current ?? 1;
					const pageSize = params.pageSize ?? 20;
					const start = (current - 1) * pageSize;

					return {
						data: aggregatedRows.slice(start, start + pageSize),
						total: aggregatedRows.length,
						success: true,
					};
				}}
				headerTitle={t("performance.titles.performanceList")}
				toolBarRender={() => {
					const buttons: React.ReactNode[] = [];

					if (isTraffic) {
						buttons.push(
							<Button
								key="update-template"
								icon={<FileExcelOutlined />}
								onClick={() => setOpenUpdateTemplate(true)}
							>
								{t("performance.traffic.editTemplate.title")}
							</Button>,
						);
					}

					if (canCreatePerformance) {
						buttons.push(
							<Button
								key="add"
								icon={<PlusCircleOutlined />}
								type="primary"
								onClick={() => navigate("/performances/new")}
							>
								{t("common.add")}
							</Button>,
						);
					}

					return buttons;
				}}
			/>

			<PerformanceDetailModal
				open={openDetail}
				service={selectedServicePath}
				companies={companies.data?.results}
				record={selectedRow}
				onClose={closePerformanceDetail}
				onUpdated={refreshTable}
			/>

			<TrafficUpdateTemplateModal
				open={openUpdateTemplate}
				serviceId={selectedServiceId}
				companyTypeOptions={updateTemplateCompanyTypeOptions}
				onClose={() => setOpenUpdateTemplate(false)}
			/>
		</BasicContent>
	);
}
