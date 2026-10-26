import type { CompanyDto } from "#src/api/common/common.types";
import type { CompanyTypeOption } from "#src/api/user/types";
import type { UnregisteredPerformancePreset } from "#src/features/performance/shared/model/performance-registration-preset";
import type { PerformanceServiceCode } from "#src/features/performance/shared/model/performance.form.types";
import type { ActionType, ProColumns, ProFormInstance } from "@ant-design/pro-components";
import type { PerformanceListRow } from "../model/performance.list.types";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { sortToOrdering } from "#src/components/basic-table/sort";
import { isSmsVendorCompany } from "#src/features/contract/shared/utils";
import { fetchUnregisteredPerformanceList } from "#src/features/performance/api/performances.api";
import { buildUnregisteredPerformanceSearch } from "#src/features/performance/shared/model/performance-registration-preset";
import { normalizePerformanceRecord, pickCompanyTypeToken, resolvePerformanceServicePath } from "#src/features/performance/shared/model/performance.helpers";
import { servicesQuery } from "#src/features/performance/shared/queries/performance.queries";
import { useAccess } from "#src/hooks";
import { PlusCircleOutlined } from "@ant-design/icons";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Button } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
	getUnregisteredPerformanceRowKey,
	isCompanyTypeFilterService,
} from "../model/unregistered-performance.model";
import { unregisteredCompaniesQuery } from "../queries/unregistered-companies.queries";
import { getPerformanceColumns } from "./constants";
import "./unregistered-performance-list.css";

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

export default function UnregisteredPerformanceList() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { hasDomainPermissionByServiceId, getPermittedCompanyTypes, getPermittedServiceIds } = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
	const [selectedCompanyType, setSelectedCompanyType] = useState<string | undefined>();
	const [hasCollocationRows, setHasCollocationRows] = useState(false);

	const permittedViewServiceIdsList = getPermittedServiceIds("performances", "view");

	const permittedViewServiceIds = useMemo(
		() => new Set(permittedViewServiceIdsList),
		[permittedViewServiceIdsList.join(",")],
	);

	const services = useQuery(servicesQuery());
	const selectedServiceId = selectedServiceIds.length === 1 ? selectedServiceIds[0] : null;

	const serviceOptions = useMemo(() => {
		return (services.data?.results ?? [])
			.filter(service => permittedViewServiceIds.has(Number(service.id)))
			.map(service => ({
				label: service.name,
				value: service.id,
				code: String(service.code ?? "").trim().toLowerCase(),
			}));
	}, [services.data, permittedViewServiceIdsList.join(",")]);

	const selectedServices = useMemo(
		() => serviceOptions.filter(option => selectedServiceIds.includes(option.value)),
		[serviceOptions, selectedServiceIds],
	);
	const selectedServiceCodes = useMemo(() => selectedServices.map(service => service.code), [selectedServices]);
	const selectedServiceCode = selectedServiceCodes.length === 1 ? selectedServiceCodes[0] : null;

	// SMS/traffic are reported per company type, so each such service is only queried for the types the user may view.
	const allowedCompanyTypesByService = useMemo(() => {
		const byService = new Map<number, CompanyTypeOption[]>();
		selectedServices
			.filter(service => isCompanyTypeFilterService(service.code))
			.forEach(service => byService.set(service.value, getPermittedCompanyTypes("performances", "view", service.value)));
		return byService;
	}, [selectedServices, getPermittedCompanyTypes]);

	const permittedCompanyTypeOptions = useMemo(() => {
		const dedup = new Map<string, CompanyTypeOption>();
		allowedCompanyTypesByService.forEach(types => types.forEach(type => dedup.has(type.key) || dedup.set(type.key, type)));
		return Array.from(dedup.values());
	}, [allowedCompanyTypesByService]);

	const hasCompanyTypeAccess = Array.from(allowedCompanyTypesByService.values()).every(types => types.length > 0);
	const canRequestReport = selectedServiceIds.length > 0 && hasCompanyTypeAccess;

	const companyQuerySpecs = useMemo(() => {
		if (!canRequestReport)
			return [];
		return selectedServices.flatMap<{ service: (typeof serviceOptions)[number], companyType: string | undefined }>((service) => {
			const allowedKeys = allowedCompanyTypesByService.get(service.value)?.map(type => type.key);
			if (!allowedKeys)
				return [{ service, companyType: undefined }];
			const types = selectedCompanyType && allowedKeys.includes(selectedCompanyType) ? [selectedCompanyType] : allowedKeys;
			return types.map(companyType => ({ service, companyType }));
		});
	}, [canRequestReport, selectedServices, allowedCompanyTypesByService, selectedCompanyType]);
	const companyQueries = useQueries({
		queries: companyQuerySpecs.map(({ service, companyType }) => unregisteredCompaniesQuery(service.value, companyType)),
	});

	useEffect(() => {
		if (selectedServiceIds.length === 0)
			return;
		const nextServiceIds = selectedServiceIds.filter(serviceId => permittedViewServiceIds.has(serviceId));
		if (nextServiceIds.length === selectedServiceIds.length)
			return;

		setSelectedServiceIds(nextServiceIds);
		formRef.current?.setFieldsValue({
			service_ids: nextServiceIds.length > 0 ? nextServiceIds : undefined,
			company_ids: undefined,
		});
	}, [selectedServiceIds, permittedViewServiceIdsList.join(",")]);

	useEffect(() => {
		if (!selectedCompanyType || permittedCompanyTypeOptions.some(type => type.key === selectedCompanyType))
			return;
		setSelectedCompanyType(undefined);
		formRef.current?.setFieldsValue({ company_type: undefined, company_ids: undefined });
	}, [selectedCompanyType, permittedCompanyTypeOptions]);

	const companyOptions = useMemo(() => {
		const dedup = new Map<number, CompanyDto>();
		companyQueries.forEach((query, index) => {
			const isSms = companyQuerySpecs[index]?.service.code === "sms";
			(query.data?.results ?? []).forEach((company) => {
				if (company.id != null && !dedup.has(company.id) && (isSms || !isSmsVendorCompany(company)))
					dedup.set(company.id, company);
			});
		});
		return Array.from(dedup.values()).map(company => ({ label: company.name, value: company.id }));
	}, [companyQueries, companyQuerySpecs]);
	const companiesLoading = companyQueries.some(query => query.isLoading);

	const setSelectedServices = (serviceIds: number[]) => {
		setSelectedServiceIds(serviceIds);
		setSelectedCompanyType(undefined);
		formRef.current?.setFieldsValue({ company_ids: undefined, company_type: undefined });
	};

	const changeSelectedCompanyType = (companyType: string | undefined) => {
		setSelectedCompanyType(companyType);
		formRef.current?.setFieldsValue({ company_ids: undefined });
	};

	const canCreatePerformance = useMemo(() => {
		if (!selectedServiceId)
			return false;
		return hasDomainPermissionByServiceId("performances", "create", selectedServiceId);
	}, [selectedServiceId, hasDomainPermissionByServiceId]);

	const openPerformanceRegistration = useCallback((record: PerformanceListRow) => {
		const normalized = normalizePerformanceRecord(record);
		const serviceOption = serviceOptions.find(option => option.value === normalized.serviceId);
		const rowServiceCode = String((record as any).service_code ?? serviceOption?.code ?? selectedServiceCode ?? "")
			.trim()
			.toLowerCase();
		const rowServicePath = resolvePerformanceServicePath(rowServiceCode as PerformanceServiceCode, normalizePerformanceRecord(record).companyType);

		if (
			!rowServicePath
			|| normalized.serviceId == null
			|| normalized.companyId == null
			|| normalized.year == null
			|| normalized.month == null
		) {
			window.$message?.error(t("performance.errors.baseFormIncomplete"));
			return;
		}
		const preset: UnregisteredPerformancePreset = {
			serviceId: normalized.serviceId,
			serviceCode: rowServiceCode as PerformanceServiceCode,
			companyId: normalized.companyId,
			companyType: normalized.companyType,
			salesAgentId: normalized.salesAgentId,
			year: normalized.year,
			month: normalized.month,
		};

		navigate({
			pathname: "/performances/new",
			search: buildUnregisteredPerformanceSearch(preset, getUnregisteredPerformanceRowKey(record)),
		}, {
			state: {
				unregisteredPreset: preset,
			},
		});
	}, [navigate, selectedServiceCode, serviceOptions, t]);

	const baseColumns = useMemo(
		() =>
			getPerformanceColumns({
				t,
				selectedServiceCodes,
				permittedCompanyTypeOptions,
				setSelectedServices,
				setSelectedCompanyType: changeSelectedCompanyType,
				serviceOptions,
				companyOptions,
				isCompanyDisabled: selectedServiceIds.length === 0 || companiesLoading,
				companyPlaceholder: selectedServiceIds.length > 0 ? t("performance.placeholders.selectCompany") : t("performance.placeholders.selectServiceFirst"),
				showCollocationMode: hasCollocationRows,
			}),
		[
			t,
			selectedServiceCodes,
			selectedServiceIds.length,
			permittedCompanyTypeOptions,
			companyOptions,
			serviceOptions,
			companiesLoading,
			hasCollocationRows,
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
					const canCreateRow = Number.isInteger(rowServiceId) && hasDomainPermissionByServiceId("performances", "create", rowServiceId, normalizePerformanceRecord(record).companyType);

					if (canCreateRow) {
						actions.push(
							<BasicButton
								key="add"
								type="link"
								size="large"
								title={t("performance.actions.submitPerformance")}
								icon={<PlusCircleOutlined />}
								onClick={() => openPerformanceRegistration(record)}
							/>,
						);
					}

					return actions;
				},
			},
		];
	}, [baseColumns, t, openPerformanceRegistration]);

	return (
		<BasicContent className="h-full">
			<BasicTable<PerformanceListRow>
				className="unregistered-performance-table"
				rowKey={getUnregisteredPerformanceRowKey}
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				request={async (params, sort) => {
					const serviceIds = normalizeNumberList((params as any).service_ids);
					const effectiveServiceIds = serviceIds.length > 0 ? serviceIds : selectedServiceIds;

					if (effectiveServiceIds.length === 0 || !canRequestReport) {
						return {
							data: [],
							total: 0,
							success: true,
						};
					}

					const companyIds = normalizeNumberList((params as any).company_ids);
					const responseData = await fetchUnregisteredPerformanceList({
						page: params.current ?? 1,
						page_size: params.pageSize ?? 10,
						service_ids: effectiveServiceIds.join(","),
						company_ids: companyIds.length > 0 ? companyIds.join(",") : undefined,
						company_type: selectedCompanyType ? (params as any).company_type : undefined,
						ordering: sortToOrdering(sort),
					});
					setHasCollocationRows(responseData.results.some(row => pickCompanyTypeToken(row.company_type) === "COLLOCATION"));
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
		</BasicContent>
	);
}
