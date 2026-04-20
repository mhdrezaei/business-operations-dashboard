import type { PerformanceFormValues } from "../../../model/performance.form.types";
import { BasicContent, TopRightAlert } from "#src/components";
import { useAccess } from "#src/hooks";
import { RHFProRadioGroup, RHFSelect } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Col, Form, Input, Row, Tag } from "antd";
import i18next from "i18next";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
	extractOpenApiContractModel,
	extractSalesAgentId,
	isSmsCommissionCode,
	normalizeOpenApiContractModel,
	pickActiveContract,
	resolveContractServicePath,
} from "../../../model/performance.helpers";
import {
	companiesByServiceQuery,
	monthlyContractStatusQuery,
	performanceContractsQuery,
	performanceGapsQuery,
	servicesQuery,
	smsCommissionAgentsQuery,
} from "../../../queries/performance.queries";

interface YearMonthOption { label: string, value: number }

const TRAFFIC_COMPANY_TYPE_OPTIONS = [
	{ label: "CP", value: "CP" },
	{ label: "IXP", value: "IXP" },
	{ label: "TCI", value: "TCI" },
	{ label: "PREMIUM", value: "PREMIUM" },
];

const TRAFFIC_SUBMIT_MODE_OPTIONS = [
	{ label: i18next.t("performance.traffic.singleEntry"), value: "single" },
	{ label: i18next.t("performance.traffic.templateUpload"), value: "template" },
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

function getMonthLabel(month: number) {
	return i18next.t(`performance.months.${month}`);
}

function mapMonthsToOptions(months: number[]) {
	return months.map(month => ({ label: getMonthLabel(month), value: month }));
}

function withSelectedOption(
	options: YearMonthOption[],
	selected: number | null,
	getLabel: (value: number) => string = value => String(value),
) {
	if (selected == null)
		return options;
	if (options.some(option => option.value === selected))
		return options;
	return [...options, { label: getLabel(selected), value: selected }].sort((a, b) => a.value - b.value);
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
	const trafficSubmitMode = useWatch({ control, name: "serviceFields.submitMode" as const }) as "single" | "template" | undefined;

	const servicePath = useMemo(() => resolveContractServicePath(serviceCode), [serviceCode]);
	const isTraffic = serviceCode === "traffic";
	const isSmsCommission = isSmsCommissionCode(serviceCode);
	const isTrafficTemplateMode = isTraffic && trafficSubmitMode === "template";
	const isTrafficSingleMode = isTraffic && trafficSubmitMode === "single";
	const usesMonthlyStatus = serviceCode === "openapi" || isTrafficSingleMode;
	const preservedServiceFields = useMemo(() => {
		if (!isTraffic || !trafficSubmitMode)
			return {};

		return { submitMode: trafficSubmitMode };
	}, [isTraffic, trafficSubmitMode]);

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
	const gaps = useQuery(performanceGapsQuery({
		serviceId,
		companyId: isTrafficTemplateMode ? null : companyId,
		companyType: isTrafficTemplateMode ? trafficCompanyType : null,
	}));
	const monthlyStatus = useQuery(monthlyContractStatusQuery({
		serviceId: usesMonthlyStatus ? serviceId : null,
		companyId: usesMonthlyStatus ? companyId : null,
		year: usesMonthlyStatus ? year : null,
		month: usesMonthlyStatus ? month : null,
	}));
	const contracts = useQuery(performanceContractsQuery({
		servicePath: usesMonthlyStatus ? null : servicePath,
		serviceId,
		companyId,
	}));
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

		setValue("contractId", null, { shouldDirty: true, shouldValidate: false });
		setValue("contractModel", null, { shouldDirty: true, shouldValidate: false });
		setValue("salesAgentId", null, { shouldDirty: true, shouldValidate: false });
		setValue("serviceFields", preservedServiceFields, { shouldDirty: true, shouldValidate: false });

		// Keep year/month when company is cleared by "submit and create another".
		if (companyId == null)
			return;

		setValue("year", null, { shouldDirty: true, shouldValidate: false });
		setValue("month", null, { shouldDirty: true, shouldValidate: false });
	}, [companyId, setValue, preservedServiceFields]);

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
		setValue("serviceFields", preservedServiceFields, { shouldDirty: true, shouldValidate: false });
	}, [year, setValue, preservedServiceFields]);

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
		if (!isTraffic) {
			if (getValues("serviceFields.submitMode" as const) != null) {
				setValue("serviceFields.submitMode" as const, undefined, { shouldDirty: false, shouldValidate: false });
			}
			return;
		}

		if (!trafficCompanyType)
			return;

		if (!trafficSubmitMode) {
			setValue("serviceFields.submitMode" as const, "single", {
				shouldDirty: false,
				shouldValidate: false,
			});
		}
	}, [isTraffic, trafficCompanyType, trafficSubmitMode, setValue, getValues]);

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

	useEffect(() => {
		if (!isTraffic)
			return;

		if (!trafficSubmitMode)
			return;

		setValue("year", null, { shouldDirty: true, shouldValidate: false });
		setValue("month", null, { shouldDirty: true, shouldValidate: false });
		setValue("contractId", null, { shouldDirty: true, shouldValidate: false });
		setValue("serviceFields.monthlyPerformanceFile" as const, [], { shouldDirty: false, shouldValidate: false });

		if (trafficSubmitMode === "template") {
			setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
		}
	}, [isTraffic, trafficSubmitMode, setValue]);

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
	const isCompanyDisabled = !serviceId || companies.isLoading || (isTraffic && (!trafficCompanyType || !isTrafficSingleMode));

	const companyPlaceholder
		= !serviceId
			? t("performance.placeholders.selectServiceFirst")
			: companies.isLoading
				? t("performance.placeholders.loadingCompanies")
				: isTraffic && !trafficCompanyType
					? t("performance.placeholders.selectTrafficCompanyTypeFirst")
					: isTraffic && !isTrafficSingleMode
						? t("performance.traffic.singleEntry")
						: t("performance.placeholders.selectCompany");

	const missingMonthsByYear = useMemo(() => {
		const map = new Map<number, number[]>();
		const raw = gaps.data?.missing_months_by_year;
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
		return Array.from(missingMonthsByYear.keys())
			.sort((a, b) => a - b)
			.map(value => ({ label: String(value), value }));
	}, [missingMonthsByYear]);

	const baseMonthOptions = useMemo(() => {
		if (year == null)
			return [];
		const months = missingMonthsByYear.get(year);
		if (months && months.length > 0)
			return mapMonthsToOptions(months);
		return [];
	}, [missingMonthsByYear, year]);

	const yearOptions = useMemo(() => withSelectedOption(baseYearOptions, year), [baseYearOptions, year]);
	const monthOptions = useMemo(
		() => withSelectedOption(baseMonthOptions, month, getMonthLabel),
		[baseMonthOptions, month],
	);

	const activeContract = useMemo(
		() => pickActiveContract(contracts.data?.results ?? [], year, month),
		[contracts.data, year, month],
	);
	const monthlyStatusContractId = monthlyStatus.data?.has_contract
		? monthlyStatus.data.base_contract_id ?? null
		: null;
	const monthlyStatusOpenApiContractModel = normalizeOpenApiContractModel(monthlyStatus.data?.openapi?.contract_model);
	const trafficHasCountyContract = monthlyStatus.data?.traffic?.has_county_contract === true;

	useEffect(() => {
		if (isTrafficTemplateMode) {
			if (getValues("contractId") !== null) {
				setValue("contractId", null, { shouldDirty: false, shouldValidate: false });
			}
			if (getValues("contractModel") !== null) {
				setValue("contractModel", null, { shouldDirty: false, shouldValidate: false });
			}
			return;
		}

		if (usesMonthlyStatus) {
			const nextContractId = monthlyStatus.isSuccess ? monthlyStatusContractId : null;
			if (getValues("contractId") !== nextContractId) {
				setValue("contractId", nextContractId, { shouldDirty: false, shouldValidate: false });
			}

			if (serviceCode === "openapi") {
				const nextContractModel = monthlyStatus.isSuccess && monthlyStatus.data?.has_contract
					? monthlyStatusOpenApiContractModel
					: null;
				if (getValues("contractModel") !== nextContractModel) {
					setValue("contractModel", nextContractModel, {
						shouldDirty: false,
						shouldValidate: false,
					});
				}
			}
			else if (getValues("contractModel") !== null) {
				setValue("contractModel", null, { shouldDirty: false, shouldValidate: false });
			}
			return;
		}

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
	}, [
		activeContract,
		getValues,
		isTrafficTemplateMode,
		monthlyStatus.data?.has_contract,
		monthlyStatus.isSuccess,
		monthlyStatusContractId,
		monthlyStatusOpenApiContractModel,
		serviceCode,
		setValue,
		usesMonthlyStatus,
	]);

	useEffect(() => {
		if (!isTrafficSingleMode)
			return;
		if (!monthlyStatus.isSuccess)
			return;

		setValue("serviceFields.countyEnabled" as const, trafficHasCountyContract, {
			shouldDirty: false,
			shouldValidate: false,
		});
	}, [isTrafficSingleMode, monthlyStatus.isSuccess, setValue, trafficHasCountyContract]);

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

	const isDateOptionsLoading = isTrafficTemplateMode
		? !!serviceId && !!trafficCompanyType && (gaps.isLoading || gaps.isFetching)
		: !!serviceId && !!companyId && (gaps.isLoading || gaps.isFetching);
	const hasCompanySelection = !!serviceId && !!companyId;
	const hasNoContractsForCompany = hasCompanySelection && contracts.isSuccess && (contracts.data?.results?.length ?? 0) < 1;
	const hasAnyYearMonthOption = Array.from(missingMonthsByYear.values()).some(months => months.length > 0);
	const isPeriodStateLoading = !isTrafficTemplateMode && hasCompanySelection && (gaps.isLoading || gaps.isFetching || contracts.isLoading || contracts.isFetching);
	const shouldShowTrafficTemplatePeriodSelectors = isTrafficTemplateMode && !!serviceId && !!trafficCompanyType && hasAnyYearMonthOption;
	const shouldShowPeriodSelectors = shouldShowTrafficTemplatePeriodSelectors || (hasCompanySelection && !isPeriodStateLoading && !hasNoContractsForCompany && hasAnyYearMonthOption);
	const shouldShowMissingPeriodError = !isTrafficTemplateMode && hasCompanySelection && !isPeriodStateLoading && !shouldShowPeriodSelectors;
	const shouldShowNoMonthlyContractAlert = usesMonthlyStatus	&& year != null	&& month != null && monthlyStatus.isSuccess && !monthlyStatus.data?.has_contract;

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
								showSearch: true,
								optionFilterProp: "label",
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
										showSearch: true,
										optionFilterProp: "label",
									}}
								/>
							</Col>
						)
						: null}

					{isTraffic && trafficCompanyType
						? (
							<Col span={12}>
								<RHFProRadioGroup<PerformanceFormValues, "serviceFields.submitMode">
									name={"serviceFields.submitMode" as const}
									label={t("performance.traffic.submitMethod")}
									radioProps={{
										optionType: "button",
										buttonStyle: "solid",
										options: TRAFFIC_SUBMIT_MODE_OPTIONS,
									}}
								/>
							</Col>
						)
						: null}

					{(!isTraffic || isTrafficSingleMode)
						? (
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
										showSearch: true,
										optionFilterProp: "label",
										style: isCompanyDisabled ? { cursor: "not-allowed" } : undefined,
										open: isCompanyDisabled ? false : undefined,
									}}
								/>
							</Col>
						)
						: null}

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

				<TopRightAlert
					alertKey="performance-missing-period-alert"
					type="error"
					open={shouldShowMissingPeriodError}
					message={hasNoContractsForCompany
						? t("performance.messages.noContractForCompany")
						: t("performance.messages.noYearMonthForCompany")}
				/>
				<TopRightAlert
					alertKey="performance-no-monthly-contract-alert"
					type="error"
					open={shouldShowNoMonthlyContractAlert}
					message={t("performance.messages.noActiveContractForMonth")}
				/>

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
							{usesMonthlyStatus && year != null && month != null && monthlyStatus.data
								? (
									<Col span={24}>
										<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
											{monthlyStatus.data.used_addendum
												? <Tag color="gold">{t("performance.badges.usedAddendum")}</Tag>
												: null}
											{serviceCode === "openapi" && monthlyStatusOpenApiContractModel
												? (
													<Tag color="blue">
														{t(`performance.contractModel.${monthlyStatusOpenApiContractModel}`)}
													</Tag>
												)
												: null}
											{isTrafficSingleMode
												? (
													<Tag color={trafficHasCountyContract ? "green" : "default"}>
														{trafficHasCountyContract
															? t("performance.badges.hasCountyContract")
															: t("performance.badges.noCountyContract")}
													</Tag>
												)
												: null}
										</div>
									</Col>
								)
								: null}
						</Row>
					)
					: null}
			</BasicContent>
		</ProCard>
	);
}
