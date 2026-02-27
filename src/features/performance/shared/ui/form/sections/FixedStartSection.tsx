import type { PerformanceFormValues } from "../../../model/performance.form.types";
import { BasicContent } from "#src/components";
import { useAccess } from "#src/hooks";
import { RHFSelect } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Col, Row } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
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
	const { control, setValue } = useFormContext<PerformanceFormValues>();
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

		setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
		setValue("trafficCompanyType", null, { shouldDirty: true, shouldValidate: true });
		setValue("year", null, { shouldDirty: true, shouldValidate: true });
		setValue("month", null, { shouldDirty: true, shouldValidate: true });
		setValue("contractId", null, { shouldDirty: true, shouldValidate: true });
		setValue("contractModel", null, { shouldDirty: true, shouldValidate: true });
		setValue("salesAgentId", null, { shouldDirty: true, shouldValidate: true });
		setValue("serviceFields", {}, { shouldDirty: true, shouldValidate: true });
	}, [serviceId, setValue]);

	useEffect(() => {
		const prevCompanyId = prevCompanyIdRef.current;
		prevCompanyIdRef.current = companyId;

		if (prevCompanyId === undefined)
			return;
		if (prevCompanyId === companyId)
			return;

		setValue("year", null, { shouldDirty: true, shouldValidate: true });
		setValue("month", null, { shouldDirty: true, shouldValidate: true });
		setValue("contractId", null, { shouldDirty: true, shouldValidate: true });
		setValue("contractModel", null, { shouldDirty: true, shouldValidate: true });
		setValue("salesAgentId", null, { shouldDirty: true, shouldValidate: true });
		setValue("serviceFields", {}, { shouldDirty: true, shouldValidate: true });
	}, [companyId, setValue]);

	useEffect(() => {
		const prevYear = prevYearRef.current;
		prevYearRef.current = year;

		if (prevYear === undefined)
			return;
		if (prevYear === year)
			return;

		setValue("month", null, { shouldDirty: true, shouldValidate: true });
		setValue("contractId", null, { shouldDirty: true, shouldValidate: true });
		setValue("contractModel", null, { shouldDirty: true, shouldValidate: true });
		setValue("serviceFields", {}, { shouldDirty: true, shouldValidate: true });
	}, [year, setValue]);

	useEffect(() => {
		const prevTrafficCompanyType = prevTrafficCompanyTypeRef.current;
		prevTrafficCompanyTypeRef.current = trafficCompanyType;

		if (prevTrafficCompanyType === undefined)
			return;
		if (prevTrafficCompanyType === trafficCompanyType)
			return;

		if (isTraffic) {
			setValue("companyId", null, { shouldDirty: true, shouldValidate: true });
		}
	}, [isTraffic, trafficCompanyType, setValue]);

	useEffect(() => {
		if (!serviceId) {
			setValue("serviceCode", null, { shouldDirty: true, shouldValidate: true });
			return;
		}

		if (!permittedCreateServiceIds.has(serviceId)) {
			setValue("serviceId", null, { shouldDirty: true, shouldValidate: true });
			setValue("serviceCode", null, { shouldDirty: true, shouldValidate: true });
			return;
		}

		const selected = (services.data?.results ?? []).find(service => service.id === serviceId);
		const code = typeof selected?.code === "string" ? selected.code.trim().toLowerCase() : "";

		setValue("serviceCode", (code || null) as any, { shouldDirty: true, shouldValidate: true });
	}, [serviceId, services.data, setValue, permittedCreateServiceIdList.join(",")]);

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
			? "ابتدا سرویس را انتخاب کنید"
			: companies.isLoading
				? "در حال دریافت لیست شرکت‌ها..."
				: isTraffic && !trafficCompanyType
					? "ابتدا نوع شرکت (ترافیک) را انتخاب کنید"
					: "شرکت را انتخاب کنید";

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
		setValue("contractId", activeContract?.id ?? null, { shouldDirty: true, shouldValidate: true });

		if (serviceCode === "openapi") {
			setValue("contractModel", extractOpenApiContractModel(activeContract), {
				shouldDirty: true,
				shouldValidate: true,
			});
		}
		else {
			setValue("contractModel", null, { shouldDirty: true, shouldValidate: true });
		}
	}, [activeContract, serviceCode, setValue]);

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

	useEffect(() => {
		if (!isSmsCommission)
			return;

		const contractAgent = extractSalesAgentId(activeContract);
		if (contractAgent != null) {
			setValue("salesAgentId", contractAgent, { shouldDirty: true, shouldValidate: true });
			return;
		}

		if (!companyId || smsCommissionAgentOptions.length < 1) {
			setValue("salesAgentId", null, { shouldDirty: true, shouldValidate: true });
			return;
		}

		const hasSelected = smsCommissionAgentOptions.some(option => option.value === salesAgentId);
		if (!hasSelected) {
			setValue("salesAgentId", smsCommissionAgentOptions[0].value, {
				shouldDirty: true,
				shouldValidate: true,
			});
		}
	}, [isSmsCommission, companyId, smsCommissionAgentOptions, salesAgentId, activeContract, setValue]);

	const isDateOptionsLoading = !!serviceId && !!companyId && (gaps.isLoading || gaps.isFetching);

	return (
		<ProCard>
			<BasicContent className="w-full">
				<Row gutter={16}>
					<Col span={12}>
						<RHFSelect<PerformanceFormValues, "serviceId", number | null>
							name="serviceId"
							label="نام سرویس"
							loading={services.isLoading}
							options={serviceOptions}
							selectProps={{
								allowClear: true,
								placeholder: "سرویس را انتخاب کنید",
							}}
						/>
					</Col>

					{isTraffic
						? (
							<Col span={12}>
								<RHFSelect<PerformanceFormValues, "trafficCompanyType", any>
									name="trafficCompanyType"
									label="نوع شرکت (ترافیک)"
									options={TRAFFIC_COMPANY_TYPE_OPTIONS}
									selectProps={{
										allowClear: true,
										placeholder: "انتخاب کنید",
									}}
								/>
							</Col>
						)
						: null}

					<Col span={12}>
						<RHFSelect<PerformanceFormValues, "companyId", number | null>
							name="companyId"
							label="نام شرکت"
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
								<RHFSelect<PerformanceFormValues, "salesAgentId", number | null>
									name="salesAgentId"
									label="نماینده فروش"
									loading={smsCommissionAgents.isLoading || smsCommissionAgents.isFetching}
									options={smsCommissionAgentOptions}
									selectProps={{
										allowClear: false,
										disabled: true,
										placeholder: !companyId
											? "ابتدا شرکت را انتخاب کنید"
											: "نماینده فروش به‌صورت خودکار انتخاب می‌شود",
										open: false,
									}}
								/>
							</Col>
						)
						: null}
				</Row>

				<Row gutter={16}>
					<Col span={12}>
						<RHFSelect<PerformanceFormValues, "year", number | null>
							name="year"
							label="سال قرارداد"
							loading={isDateOptionsLoading}
							options={yearOptions}
							selectProps={{
								allowClear: true,
								placeholder: "سال",
							}}
						/>
					</Col>
					<Col span={12}>
						<RHFSelect<PerformanceFormValues, "month", number | null>
							name="month"
							label="ماه قرارداد"
							loading={isDateOptionsLoading}
							options={monthOptions}
							selectProps={{
								allowClear: true,
								placeholder: year == null ? "ابتدا سال را انتخاب کنید" : "ماه",
								disabled: year == null,
							}}
						/>
					</Col>
				</Row>
			</BasicContent>
		</ProCard>
	);
}
