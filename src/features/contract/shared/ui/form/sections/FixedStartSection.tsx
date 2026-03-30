import type { ContractFormValues } from "../../../model/contract.form.types";
import { BasicContent } from "#src/components/";
import { useAccess } from "#src/hooks";
import { RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useQuery } from "@tanstack/react-query";
import { Col, Row } from "antd";
import React, { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { companiesByServiceQuery, contractGapsQuery, servicesQuery, smsCommissionAgentsQuery } from "../../../queries/contract.queries";
import { MONTH_OPTIONS } from "../constants/jalali-date-options";

const COUNTERPARTY_OPTIONS = [
	{ label: "شرکای تجاری", value: "partners" },
	{ label: "دولت و اپراتورها", value: "gov_ops" },
];

const TRAFFIC_COMPANY_TYPE_OPTIONS = [
	{ label: "CP", value: "CP" },
	{ label: "IXP", value: "IXP" },
	{ label: "TCI", value: "TCI" },
	{ label: "PREMIUM", value: "PREMIUM" },
];

function isSmsCommissionCode(code: string | null | undefined) {
	const normalized = typeof code === "string" ? code.trim().toLowerCase() : "";
	return normalized === "sms-commission" || normalized === "sms_commission";
}

interface JalaliRange {
	start_jy: number
	start_jm: number
	end_jy: number
	end_jm: number
}

interface YearMonthOption {
	label: string
	value: number
}

function normalizeMonthList(months: unknown): number[] {
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

function buildYearOptionsFromRange(range: JalaliRange | null | undefined): YearMonthOption[] {
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

function buildMonthOptionsFromRange(year: number, range: JalaliRange | null | undefined): YearMonthOption[] {
	if (!range)
		return [];
	if (year < range.start_jy || year > range.end_jy)
		return [];

	const startMonth = year === range.start_jy ? Math.max(1, Math.min(12, range.start_jm)) : 1;
	const endMonth = year === range.end_jy ? Math.max(1, Math.min(12, range.end_jm)) : 12;
	if (startMonth > endMonth)
		return [];

	return Array.from({ length: endMonth - startMonth + 1 }, (_, idx) => {
		const month = startMonth + idx;
		const found = MONTH_OPTIONS.find(option => option.value === month);
		return { label: String(found?.label ?? month), value: month };
	});
}

function mapMonthsToOptions(months: number[]): YearMonthOption[] {
	return months.map((month) => {
		const found = MONTH_OPTIONS.find(option => option.value === month);
		return { label: String(found?.label ?? month), value: month };
	});
}

function withSelectedOption(options: YearMonthOption[], selected: number | null): YearMonthOption[] {
	if (selected == null)
		return options;
	if (options.some(option => option.value === selected))
		return options;

	return [...options, { label: String(selected), value: selected }].sort((a, b) => a.value - b.value);
}

export function FixedStartSection() {
	const { setValue, control, trigger, formState, resetField } = useFormContext<ContractFormValues>();
	const { getPermittedServiceIds } = useAccess();

	const services = useQuery(servicesQuery());

	const serviceId = useWatch({ control, name: "serviceId" });
	const serviceCode = useWatch({ control, name: "serviceCode" });
	const companyId = useWatch({ control, name: "companyId" });
	const counterpartyType = useWatch({ control, name: "counterpartyType" });
	const trafficCompanyType = useWatch({ control, name: "trafficCompanyType" });
	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });
	const selectedAgentId = useWatch({ control, name: "serviceFields.agent" as any });
	const serviceIsOfficial = useWatch({ control, name: "serviceFields.isOfficial" as any }) as boolean | null | undefined;

	const permittedCreateServiceIdList = getPermittedServiceIds("contracts", "create");
	const permittedCreateServiceIds = useMemo(
		() => new Set(permittedCreateServiceIdList),
		[permittedCreateServiceIdList.join(",")],
	);

	const companies = useQuery(companiesByServiceQuery(serviceId));
	const contractGaps = useQuery(contractGapsQuery({ serviceId, companyId }));

	const isSms = serviceCode === "sms";
	const isTraffic = serviceCode === "traffic";
	const isSmsCommission = isSmsCommissionCode(serviceCode);
	const smsCommissionAgents = useQuery(smsCommissionAgentsQuery(isSmsCommission && !!companyId));

	useEffect(() => {
		if (!isSms && !isTraffic)
			return;

		if (typeof serviceIsOfficial !== "boolean") {
			setValue("serviceFields.isOfficial" as any, true, {
				shouldDirty: false,
				shouldValidate: false,
			});
		}
	}, [isSms, isTraffic, serviceIsOfficial, setValue]);

	const prevServiceIdRef = useRef<typeof serviceId>(undefined);
	const prevCompanyIdRef = useRef<typeof companyId>(undefined);
	const prevTrafficCompanyTypeRef = useRef<typeof trafficCompanyType>(undefined);
	const prevCounterpartyTypeRef = useRef<typeof counterpartyType>(undefined);
	const prevStartYearRef = useRef<typeof startYear>(undefined);
	const prevEndYearRef = useRef<typeof endYear>(undefined);
	const lastValidatedDateKeyRef = useRef<string>("");

	useEffect(() => {
		const prev = prevServiceIdRef.current;
		prevServiceIdRef.current = serviceId;

		if (prev === undefined)
			return;

		if (prev !== serviceId) {
			resetField("companyId", { defaultValue: null });
			resetField("counterpartyType", { defaultValue: null });
			resetField("trafficCompanyType" as any, { defaultValue: null });
			resetField("startYear", { defaultValue: null });
			resetField("startMonth", { defaultValue: null });
			resetField("endYear", { defaultValue: null });
			resetField("endMonth", { defaultValue: null });
			resetField("contractNumber" as any, { defaultValue: "" as any });
			resetField("serviceFields", { defaultValue: {} as any });
			lastValidatedDateKeyRef.current = "";
		}
	}, [serviceId, resetField]);

	useEffect(() => {
		if (!serviceId) {
			setValue("serviceCode", null, { shouldDirty: true, shouldValidate: false });
			return;
		}

		if (!permittedCreateServiceIds.has(serviceId)) {
			setValue("serviceId", null, { shouldDirty: true, shouldValidate: false });
			setValue("serviceCode", null, { shouldDirty: true, shouldValidate: false });
			setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
			return;
		}

		if (!services.data?.results?.length)
			return;

		const selected = services.data.results.find(s => s.id === serviceId && permittedCreateServiceIds.has(s.id));
		const normalizedCode = typeof selected?.code === "string" ? selected.code.trim().toLowerCase() : "";
		if (!normalizedCode)
			return;

		setValue("serviceCode", normalizedCode as any, { shouldDirty: true, shouldValidate: false });
	}, [serviceId, services.data, setValue, permittedCreateServiceIdList.join(",")]);

	useEffect(() => {
		const prev = prevCounterpartyTypeRef.current;
		prevCounterpartyTypeRef.current = counterpartyType;

		if (prev === undefined)
			return;

		if (isSms && counterpartyType === "gov_ops" && prev !== counterpartyType) {
			setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
		}
	}, [isSms, counterpartyType, setValue]);

	useEffect(() => {
		const prev = prevTrafficCompanyTypeRef.current;
		prevTrafficCompanyTypeRef.current = trafficCompanyType;

		if (prev === undefined)
			return;

		if (isTraffic && prev !== trafficCompanyType) {
			setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
		}
	}, [isTraffic, trafficCompanyType, setValue]);

	useEffect(() => {
		const prev = prevCompanyIdRef.current;
		prevCompanyIdRef.current = companyId;

		if (prev === undefined)
			return;

		if (prev !== companyId) {
			setValue("startYear", null, { shouldDirty: true, shouldValidate: false });
			setValue("startMonth", null, { shouldDirty: true, shouldValidate: false });
			setValue("endYear", null, { shouldDirty: true, shouldValidate: false });
			setValue("endMonth", null, { shouldDirty: true, shouldValidate: false });
		}
	}, [companyId, setValue]);

	useEffect(() => {
		const prev = prevStartYearRef.current;
		prevStartYearRef.current = startYear;

		if (prev === undefined)
			return;

		if (prev !== startYear) {
			setValue("startMonth", null, { shouldDirty: true, shouldValidate: false });
		}
	}, [startYear, setValue]);

	useEffect(() => {
		const prev = prevEndYearRef.current;
		prevEndYearRef.current = endYear;

		if (prev === undefined)
			return;

		if (prev !== endYear) {
			setValue("endMonth", null, { shouldDirty: true, shouldValidate: false });
		}
	}, [endYear, setValue]);

	useEffect(() => {
		const allDateFieldsAreSelected
			= startYear != null && startMonth != null && endYear != null && endMonth != null;

		const dateFieldsTouched
			= !!formState.touchedFields.startYear || !!formState.touchedFields.startMonth || !!formState.touchedFields.endYear || !!formState.touchedFields.endMonth;

		if (!allDateFieldsAreSelected || !dateFieldsTouched)
			return;

		const currentKey = `${startYear}-${startMonth}-${endYear}-${endMonth}`;
		if (lastValidatedDateKeyRef.current === currentKey)
			return;

		lastValidatedDateKeyRef.current = currentKey;
		void trigger(["endYear", "endMonth"]);
	}, [
		startYear,
		startMonth,
		endYear,
		endMonth,
		formState.touchedFields.startYear,
		formState.touchedFields.startMonth,
		formState.touchedFields.endYear,
		formState.touchedFields.endMonth,
		trigger,
	]);

	const serviceOptions = useMemo(
		() =>
			(services.data?.results ?? [])
				.filter(service => permittedCreateServiceIds.has(service.id))
				.map(service => ({ label: service.name, value: service.id })),
		[services.data, permittedCreateServiceIdList.join(",")],
	);

	const companyOptionsDefault = useMemo(
		() =>
			(companies.data?.results ?? []).map((c: any) => ({
				label: c.name,
				value: c.id,
			})),
		[companies.data],
	);

	const companyOptionsTraffic = useMemo(() => {
		const list = companies.data?.results ?? [];
		if (!trafficCompanyType)
			return [];
		return list
			.filter((c: any) => c.company_type === trafficCompanyType)
			.map((c: any) => ({ label: c.name, value: c.id }));
	}, [companies.data, trafficCompanyType]);

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

	const smsCommissionAgentPlaceholder
		= !companyId
			? "ابتدا شرکت را انتخاب کنید"
			: smsCommissionAgents.isLoading
				? "در حال دریافت نماینده فروش..."
				: smsCommissionAgentOptions.length > 0
					? "نماینده فروش به صورت خودکار انتخاب می‌شود"
					: "نماینده فروشی برای این شرکت یافت نشد";

	useEffect(() => {
		if (!isSmsCommission)
			return;

		if (!companyId || smsCommissionAgentOptions.length === 0) {
			setValue("serviceFields.agent" as any, null, { shouldDirty: true, shouldValidate: false });
			return;
		}

		const hasSelected = smsCommissionAgentOptions.some(option => option.value === selectedAgentId);
		if (!hasSelected) {
			setValue("serviceFields.agent" as any, smsCommissionAgentOptions[0].value, {
				shouldDirty: true,
				shouldValidate: false,
			});
		}
	}, [isSmsCommission, companyId, smsCommissionAgentOptions, selectedAgentId, setValue]);

	const showCompanySelect
		= (!isSms && !isTraffic) || (isSms && counterpartyType === "partners") || (isTraffic && !!trafficCompanyType);

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

	const missingMonthsByYear = useMemo(() => {
		const output = new Map<number, number[]>();
		const raw = contractGaps.data?.missing_months_by_year;
		if (!raw)
			return output;

		Object.entries(raw).forEach(([yearStr, months]) => {
			const year = Number(yearStr);
			if (!Number.isInteger(year))
				return;
			output.set(year, normalizeMonthList(months));
		});

		return output;
	}, [contractGaps.data]);

	const baseYearOptions = useMemo(() => {
		const yearsFromMissing = Array.from(missingMonthsByYear.keys()).sort((a, b) => a - b);
		if (yearsFromMissing.length > 0) {
			return yearsFromMissing.map(year => ({ label: String(year), value: year }));
		}

		return buildYearOptionsFromRange(contractGaps.data?.allowed_jalali_range as JalaliRange | null | undefined);
	}, [missingMonthsByYear, contractGaps.data]);

	const baseStartMonthOptions = useMemo(() => {
		if (startYear == null)
			return [];

		const months = missingMonthsByYear.get(startYear);
		if (months && months.length > 0)
			return mapMonthsToOptions(months);
		if (missingMonthsByYear.size > 0)
			return [];

		return buildMonthOptionsFromRange(startYear, contractGaps.data?.allowed_jalali_range as JalaliRange | null | undefined);
	}, [startYear, missingMonthsByYear, contractGaps.data]);

	const baseEndMonthOptions = useMemo(() => {
		if (endYear == null)
			return [];

		const months = missingMonthsByYear.get(endYear);
		if (months && months.length > 0)
			return mapMonthsToOptions(months);
		if (missingMonthsByYear.size > 0)
			return [];

		return buildMonthOptionsFromRange(endYear, contractGaps.data?.allowed_jalali_range as JalaliRange | null | undefined);
	}, [endYear, missingMonthsByYear, contractGaps.data]);

	const startYearOptions = useMemo(
		() => withSelectedOption(baseYearOptions, startYear),
		[baseYearOptions, startYear],
	);
	const endYearOptions = useMemo(
		() => withSelectedOption(baseYearOptions, endYear),
		[baseYearOptions, endYear],
	);
	const startMonthOptions = useMemo(
		() => withSelectedOption(baseStartMonthOptions, startMonth),
		[baseStartMonthOptions, startMonth],
	);
	const endMonthOptions = useMemo(
		() => withSelectedOption(baseEndMonthOptions, endMonth),
		[baseEndMonthOptions, endMonth],
	);

	const canQueryDateGaps = !!serviceId && !!companyId;
	const isDateOptionsLoading = canQueryDateGaps && (contractGaps.isLoading || contractGaps.isFetching);

	return (
		<ProCard>
			<BasicContent className="w-full">
				<Row gutter={16}>
					<Col span={12}>
						<RHFSelect<ContractFormValues, "serviceId", number | null>
							name="serviceId"
							label="نوع سرویس"
							loading={services.isLoading}
							options={serviceOptions}
							selectProps={{ allowClear: true, placeholder: "سرویس را انتخاب کنید" }}
						/>
					</Col>

					{isSms
						? (
							<Col span={12}>
								<RHFSelect<ContractFormValues, "counterpartyType", "partners" | "gov_ops" | null>
									name="counterpartyType"
									label="طرف قرارداد"
									options={COUNTERPARTY_OPTIONS}
									selectProps={{ allowClear: true, placeholder: "انتخاب کنید" }}
								/>
							</Col>
						)
						: null}

					{isTraffic
						? (
							<Col span={12}>
								<RHFSelect<ContractFormValues, "trafficCompanyType", any>
									name="trafficCompanyType"
									label="نوع شرکت (ترافیک)"
									options={TRAFFIC_COMPANY_TYPE_OPTIONS}
									selectProps={{ allowClear: true, placeholder: "انتخاب کنید" }}
								/>
							</Col>
						)
						: null}

					{showCompanySelect
						? (
							<Col span={12}>
								<RHFSelect<ContractFormValues, "companyId", number | null>
									name="companyId"
									label="شرکت"
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
						)
						: null}

					{isSmsCommission
						? (
							<Col span={24}>
								<RHFSelect<ContractFormValues, any, number | null>
									name={"serviceFields.agent" as any}
									label="نماینده فروش"
									loading={smsCommissionAgents.isLoading || smsCommissionAgents.isFetching}
									options={smsCommissionAgentOptions as any}
									selectProps={{
										allowClear: false,
										disabled: true,
										placeholder: smsCommissionAgentPlaceholder,
										open: false,
									}}
								/>
							</Col>
						)
						: null}
				</Row>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
						gap: 12,
						marginTop: 8,
					}}
				>
					<RHFSelect<ContractFormValues, "startYear", number | null>
						name="startYear"
						label="سال شروع"
						loading={isDateOptionsLoading}
						options={startYearOptions}
						selectProps={{ allowClear: true, placeholder: "سال" }}
					/>

					<RHFSelect<ContractFormValues, "startMonth", number | null>
						name="startMonth"
						label="ماه شروع"
						loading={isDateOptionsLoading}
						options={startMonthOptions}
						selectProps={{ allowClear: true, placeholder: "ماه" }}
					/>

					<RHFSelect<ContractFormValues, "endYear", number | null>
						name="endYear"
						label="سال پایان"
						loading={isDateOptionsLoading}
						options={endYearOptions}
						selectProps={{ allowClear: true, placeholder: "سال" }}
					/>

					<RHFSelect<ContractFormValues, "endMonth", number | null>
						name="endMonth"
						label="ماه پایان"
						loading={isDateOptionsLoading}
						options={endMonthOptions}
						selectProps={{ allowClear: true, placeholder: "ماه" }}
					/>
				</div>
				<Row>
					<Col span={12}>
						<RHFProText name="contractNumber" label="شماره قرارداد" />
					</Col>
				</Row>
			</BasicContent>
		</ProCard>
	);
}
