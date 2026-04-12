import type { PerformanceFormValues } from "../../../model/performance.form.types";
import { BasicContent } from "#src/components";
import { useAccess } from "#src/hooks";
import { RHFSelect } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Alert, Col, Form, Input, Row } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
	extractOpenApiContractModel,
	extractSalesAgentId,
	isSmsCommissionCode,
	pickActiveContract,
	resolveContractServicePath,
} from "../../../model/performance.helpers";
import {
	companiesByServiceQuery,
	performanceContractsQuery,
	performanceGapsQuery,
	servicesQuery,
	smsCommissionAgentsQuery,
} from "../../../queries/performance.queries";
import { MONTH_OPTIONS } from "../constants/jalali-date-options";

interface YearMonthOption { label: string, value: number }
interface JalaliYearRange {
	start_jy: number
	end_jy: number
}

const TRAFFIC_COMPANY_TYPE_OPTIONS = [
	{ label: "CP", value: "CP" },
	{ label: "IXP", value: "IXP" },
	{ label: "TCI", value: "TCI" },
	{ label: "PREMIUM", value: "PREMIUM" },
];

function normalizeMonthList(months: unknown) {
	if (!Array.isArray(months))
		return [];
	return Array.from(
		new Set(
			months
				.map(month => Number(month))
				.filter(month => Number.isInteger(month) && month >= 1 && month <= 12),
		),
	).sort((a, b) => a - b);
}

function mapMonthsToOptions(months: number[]) {
	return months.map((month) => {
		const found = MONTH_OPTIONS.find(option => option.value === month);
		return { label: String(found?.label ?? month), value: month };
	});
}

function withSelectedOption(options: YearMonthOption[], selected: number | null) {
	if (selected == null)
		return options;
	if (options.some(option => option.value === selected))
		return options;
	return [...options, { label: String(selected), value: selected }].sort((a, b) => a.value - b.value);
}

function buildYearOptionsFromRange(range: JalaliYearRange | null | undefined) {
	if (!range)
		return [];
	const startYear = Number(range.start_jy);
	const endYear = Number(range.end_jy);
	if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || startYear > endYear)
		return [];
	return Array.from({ length: endYear - startYear + 1 }, (_, idx) => {
		const year = startYear + idx;
		return { label: String(year), value: year };
	});
}

export function FixedStartSection() {
	const { t } = useTranslation();
	const { control, setValue, getValues } = useFormContext<PerformanceFormValues>();
	const { getPermittedServiceIds } = useAccess();

	const services = useQuery(servicesQuery());

	const serviceId = useWatch({ control, name: "serviceId" });
	const serviceCode = useWatch({ control, name: "serviceCode" });
	const companyId = useWatch({ control, name: "companyId" });
	const trafficCompanyType = useWatch({ control, name: "trafficCompanyType" });
	const year = useWatch({ control, name: "year" });
	const month = useWatch({ control, name: "month" });
	const salesAgentId = useWatch({ control, name: "salesAgentId" });

	const servicePath = useMemo(() => resolveContractServicePath(serviceCode), [serviceCode]);
	const isTraffic = serviceCode === "traffic";
	const isSmsCommission = isSmsCommissionCode(serviceCode);

	const permittedCreateIdsFromPerformance = getPermittedServiceIds("performances", "create");
	const permittedCreateIdsFromContracts = getPermittedServiceIds("contracts", "create");
	const permittedCreateServiceIdList = permittedCreateIdsFromPerformance.length > 0
		? permittedCreateIdsFromPerformance
		: permittedCreateIdsFromContracts;

	const permittedCreateServiceIds = useMemo(
		() => new Set(permittedCreateServiceIdList),
		[permittedCreateServiceIdList.join(",")],
	);

	const companies = useQuery(companiesByServiceQuery(serviceId));
	const gaps = useQuery(performanceGapsQuery({ serviceId, companyId }));
	const contracts = useQuery(performanceContractsQuery({ servicePath, serviceId, companyId }));
	const smsCommissionAgents = useQuery(smsCommissionAgentsQuery(isSmsCommission && !!companyId));

	const prevServiceIdRef = useRef<typeof serviceId>(undefined);
	const prevCompanyIdRef = useRef<typeof companyId>(undefined);
	const prevYearRef = useRef<typeof year>(undefined);
	const prevTrafficCompanyTypeRef = useRef<typeof trafficCompanyType>(undefined);

	useEffect(() => {
		const prevServiceId = prevServiceIdRef.current;
		prevServiceIdRef.current = serviceId;

		if (prevServiceId === undefined)
			return;
		if (prevServiceId === serviceId)
			return;

		setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
		setValue("trafficCompanyType", null, { shouldDirty: true, shouldValidate: false });
		setValue("year", null, { shouldDirty: true, shouldValidate: false });
		setValue("month", null, { shouldDirty: true, shouldValidate: false });
		setValue("contractId", null, { shouldDirty: true, shouldValidate: false });
		setValue("contractModel", null, { shouldDirty: true, shouldValidate: false });
		setValue("salesAgentId", null, { shouldDirty: true, shouldValidate: false });
		setValue("serviceFields", {}, { shouldDirty: true, shouldValidate: false });
	}, [serviceId, setValue]);

	useEffect(() => {
		const prevCompanyId = prevCompanyIdRef.current;
		prevCompanyIdRef.current = companyId;

		if (prevCompanyId === undefined)
			return;
		if (prevCompanyId === companyId)
			return;

		setValue("year", null, { shouldDirty: true, shouldValidate: false });
		setValue("month", null, { shouldDirty: true, shouldValidate: false });
		setValue("contractId", null, { shouldDirty: true, shouldValidate: false });
		setValue("contractModel", null, { shouldDirty: true, shouldValidate: false });
		setValue("salesAgentId", null, { shouldDirty: true, shouldValidate: false });
		setValue("serviceFields", {}, { shouldDirty: true, shouldValidate: false });
	}, [companyId, setValue]);

	useEffect(() => {
		const prevYear = prevYearRef.current;
		prevYearRef.current = year;

		if (prevYear === undefined)
			return;
		if (prevYear === year)
			return;

		setValue("month", null, { shouldDirty: true, shouldValidate: false });
		setValue("contractId", null, { shouldDirty: true, shouldValidate: false });
		setValue("contractModel", null, { shouldDirty: true, shouldValidate: false });
		setValue("serviceFields", {}, { shouldDirty: true, shouldValidate: false });
	}, [year, setValue]);

	useEffect(() => {
		const prevTrafficCompanyType = prevTrafficCompanyTypeRef.current;
		prevTrafficCompanyTypeRef.current = trafficCompanyType;

		if (prevTrafficCompanyType === undefined)
			return;
		if (prevTrafficCompanyType === trafficCompanyType)
			return;

		if (isTraffic) {
			setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
		}
	}, [isTraffic, trafficCompanyType, setValue]);

	useEffect(() => {
		if (!serviceId) {
			if (getValues("serviceCode") !== null) {
				setValue("serviceCode", null, { shouldDirty: false, shouldValidate: false });
			}
			return;
		}

		if (!permittedCreateServiceIds.has(serviceId)) {
			setValue("serviceId", null, { shouldDirty: true, shouldValidate: false });
			if (getValues("serviceCode") !== null) {
				setValue("serviceCode", null, { shouldDirty: false, shouldValidate: false });
			}
			return;
		}

		const selected = (services.data?.results ?? []).find(service => service.id === serviceId);
		const code = typeof selected?.code === "string" ? selected.code.trim().toLowerCase() : "";
		const nextServiceCode = (code || null) as any;
		if (getValues("serviceCode") !== nextServiceCode) {
			setValue("serviceCode", nextServiceCode, { shouldDirty: false, shouldValidate: false });
		}
	}, [serviceId, services.data, setValue, getValues, permittedCreateServiceIdList.join(",")]);

	const serviceOptions = useMemo(
		() =>
			(services.data?.results ?? [])
				.filter(service => permittedCreateServiceIds.has(service.id))
				.map(service => ({ label: service.name, value: service.id })),
		[services.data, permittedCreateServiceIdList.join(",")],
	);

	const companyOptionsDefault = useMemo(
		() =>
			(companies.data?.results ?? []).map(company => ({
				label: company.name,
				value: company.id,
			})),
		[companies.data],
	);

	const companyOptionsTraffic = useMemo(() => {
		if (!trafficCompanyType)
			return [];
		return (companies.data?.results ?? [])
			.filter(company => company.company_type === trafficCompanyType)
			.map(company => ({ label: company.name, value: company.id }));
	}, [companies.data, trafficCompanyType]);

	const companyOptions = isTraffic ? companyOptionsTraffic : companyOptionsDefault;
	const isCompanyDisabled = !serviceId || companies.isLoading || (isTraffic && !trafficCompanyType);

	const companyPlaceholder
		= !serviceId
			? t("performance.placeholders.selectServiceFirst")
			: companies.isLoading
				? t("performance.placeholders.loadingCompanies")
				: isTraffic && !trafficCompanyType
					? t("performance.placeholders.selectTrafficCompanyTypeFirst")
					: t("performance.placeholders.selectCompany");

	const contractMonthsByYear = useMemo(() => {
		const map = new Map<number, number[]>();
		const raw = gaps.data?.contract_months_by_year;
		if (!raw)
			return map;

		Object.entries(raw).forEach(([yearKey, months]) => {
			const numericYear = Number(yearKey);
			if (!Number.isInteger(numericYear))
				return;
			map.set(numericYear, normalizeMonthList(months));
		});

		return map;
	}, [gaps.data]);

	const baseYearOptions = useMemo(() => {
		const years = Array.from(contractMonthsByYear.keys()).sort((a, b) => a - b);
		if (years.length > 0) {
			return years.map(value => ({ label: String(value), value }));
		}

		const range = gaps.data?.allowed_jalali_range;
		if (!range)
			return [];

		return buildYearOptionsFromRange({
			start_jy: range.start_jy,
			end_jy: range.end_jy,
		});
	}, [contractMonthsByYear, gaps.data]);

	const baseMonthOptions = useMemo(() => {
		if (year == null)
			return [];
		const months = contractMonthsByYear.get(year);
		if (months && months.length > 0)
			return mapMonthsToOptions(months);
		return [];
	}, [contractMonthsByYear, year]);

	const yearOptions = useMemo(() => withSelectedOption(baseYearOptions, year), [baseYearOptions, year]);
	const monthOptions = useMemo(() => withSelectedOption(baseMonthOptions, month), [baseMonthOptions, month]);

	const activeContract = useMemo(
		() => pickActiveContract(contracts.data?.results ?? [], year, month),
		[contracts.data, year, month],
	);

	useEffect(() => {
		const nextContractId = activeContract?.id ?? null;
		if (getValues("contractId") !== nextContractId) {
			setValue("contractId", nextContractId, { shouldDirty: false, shouldValidate: false });
		}

		if (serviceCode === "openapi") {
			const nextContractModel = extractOpenApiContractModel(activeContract);
			if (getValues("contractModel") !== nextContractModel) {
				setValue("contractModel", nextContractModel, {
					shouldDirty: false,
					shouldValidate: false,
				});
			}
		}
		else {
			if (getValues("contractModel") !== null) {
				setValue("contractModel", null, { shouldDirty: false, shouldValidate: false });
			}
		}
	}, [activeContract, serviceCode, setValue, getValues]);

	const smsCommissionAgentOptions = useMemo(() => {
		if (!companyId)
			return [];

		return (smsCommissionAgents.data?.results ?? [])
			.filter(agent => Number(agent.company) === Number(companyId))
			.map(agent => ({
				label: agent.name,
				value: agent.id,
			}));
	}, [smsCommissionAgents.data, companyId]);

	const salesAgentDisplayValue = useMemo(() => {
		if (!companyId)
			return t("performance.placeholders.selectCompanyFirst");

		if (smsCommissionAgents.isLoading)
			return t("performance.placeholders.loadingSalesAgent");

		const selected = smsCommissionAgentOptions.find(option => option.value === salesAgentId);
		if (selected)
			return String(selected.label);

		if (smsCommissionAgentOptions.length > 0)
			return String(smsCommissionAgentOptions[0].label);

		return t("performance.messages.salesAgentNotFound");
	}, [companyId, smsCommissionAgents.isLoading, smsCommissionAgentOptions, salesAgentId, t]);

	useEffect(() => {
		if (!isSmsCommission)
			return;

		const contractAgent = extractSalesAgentId(activeContract);
		if (contractAgent != null) {
			if (salesAgentId !== contractAgent) {
				setValue("salesAgentId", contractAgent, { shouldDirty: false, shouldValidate: false });
			}
			return;
		}

		if (!companyId || smsCommissionAgentOptions.length < 1) {
			if (salesAgentId != null) {
				setValue("salesAgentId", null, { shouldDirty: false, shouldValidate: false });
			}
			return;
		}

		const hasSelected = smsCommissionAgentOptions.some(option => option.value === salesAgentId);
		if (!hasSelected) {
			setValue("salesAgentId", smsCommissionAgentOptions[0].value, {
				shouldDirty: false,
				shouldValidate: false,
			});
		}
	}, [isSmsCommission, companyId, smsCommissionAgentOptions, salesAgentId, activeContract, setValue]);

	const isDateOptionsLoading = !!serviceId && !!companyId && (gaps.isLoading || gaps.isFetching);
	const hasCompanySelection = !!serviceId && !!companyId;
	const hasNoContractsForCompany = hasCompanySelection && contracts.isSuccess && (contracts.data?.results?.length ?? 0) < 1;
	const hasAnyYearMonthOption = Array.from(contractMonthsByYear.values()).some(months => months.length > 0);
	const isPeriodStateLoading = hasCompanySelection && (gaps.isLoading || gaps.isFetching || contracts.isLoading || contracts.isFetching);
	const shouldShowPeriodSelectors = hasCompanySelection && !isPeriodStateLoading && !hasNoContractsForCompany && hasAnyYearMonthOption;
	const shouldShowMissingPeriodError = hasCompanySelection && !isPeriodStateLoading && !shouldShowPeriodSelectors;

	useEffect(() => {
		if (!shouldShowMissingPeriodError)
			return;

		if (getValues("year") != null) {
			setValue("year", null, { shouldDirty: true, shouldValidate: false });
		}
		if (getValues("month") != null) {
			setValue("month", null, { shouldDirty: true, shouldValidate: false });
		}
		if (getValues("contractId") != null) {
			setValue("contractId", null, { shouldDirty: true, shouldValidate: false });
		}
		if (getValues("contractModel") != null) {
			setValue("contractModel", null, { shouldDirty: true, shouldValidate: false });
		}
	}, [shouldShowMissingPeriodError, setValue, getValues]);

	return (
		<ProCard>
			<BasicContent className="w-full">
				<Row gutter={16}>
					<Col span={12}>
						<RHFSelect<PerformanceFormValues, "serviceId", number | null>
							name="serviceId"
							label={t("performance.labels.serviceName")}
							loading={services.isLoading}
							options={serviceOptions}
							selectProps={{
								allowClear: true,
								placeholder: t("performance.placeholders.selectService"),
							}}
						/>
					</Col>

					{isTraffic
						? (
							<Col span={12}>
								<RHFSelect<PerformanceFormValues, "trafficCompanyType", any>
									name="trafficCompanyType"
									label={t("performance.labels.trafficCompanyType")}
									options={TRAFFIC_COMPANY_TYPE_OPTIONS}
									selectProps={{
										allowClear: true,
										placeholder: t("performance.placeholders.select"),
									}}
								/>
							</Col>
						)
						: null}

					<Col span={12}>
						<RHFSelect<PerformanceFormValues, "companyId", number | null>
							name="companyId"
							label={t("performance.labels.companyName")}
							loading={companies.isLoading}
							options={companyOptions as any}
							selectProps={{
								allowClear: true,
								disabled: isCompanyDisabled,
								placeholder: companyPlaceholder,
								style: isCompanyDisabled ? { cursor: "not-allowed" } : undefined,
								open: isCompanyDisabled ? false : undefined,
							}}
						/>
					</Col>

					{isSmsCommission
						? (
							<Col span={24}>
								<Form.Item
									label={t("performance.columns.salesAgent")}
									extra={companyId ? t("performance.messages.salesAgentAutoSelected") : undefined}
								>
									<Input readOnly value={salesAgentDisplayValue} />
								</Form.Item>
							</Col>
						)
						: null}
				</Row>

				{shouldShowMissingPeriodError
					? (
						<Row>
							<Col span={24}>
								<Alert
									type="error"
									showIcon
									message={hasNoContractsForCompany
										? t("performance.messages.noContractForCompany")
										: t("performance.messages.noYearMonthForCompany")}
								/>
							</Col>
						</Row>
					)
					: null}

				{shouldShowPeriodSelectors
					? (
						<Row gutter={16}>
							<Col span={12}>
								<RHFSelect<PerformanceFormValues, "year", number | null>
									name="year"
									label={t("performance.labels.contractYear")}
									loading={isDateOptionsLoading}
									options={yearOptions}
									selectProps={{
										allowClear: true,
										placeholder: t("performance.placeholders.year"),
									}}
								/>
							</Col>
							<Col span={12}>
								<RHFSelect<PerformanceFormValues, "month", number | null>
									name="month"
									label={t("performance.labels.contractMonth")}
									loading={isDateOptionsLoading}
									options={monthOptions}
									selectProps={{
										allowClear: true,
										placeholder: year == null ? t("performance.placeholders.selectYearFirst") : t("performance.placeholders.month"),
										disabled: year == null,
									}}
								/>
							</Col>
						</Row>
					)
					: null}
			</BasicContent>
		</ProCard>
	);
}
