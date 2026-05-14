import type { ContractFormValues } from "../../../model/contract.form.types";
import { BasicContent } from "#src/components/";
import { useAccess } from "#src/hooks";
import { RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { useQuery } from "@tanstack/react-query";
import { Card } from "antd";
import React, { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { companiesByServiceQuery, contractGapsQuery, servicesQuery, smsCommissionAgentsQuery } from "../../../queries/contract.queries";
import { companyTypeMatches } from "../../../utils";
import { ContractAlignedField, useContractAlignedLabelWidth } from "../components/ContractAlignedField";
import { MONTH_OPTIONS } from "../constants/jalali-date-options";

const COUNTERPARTY_OPTIONS = [
	{ label: "شرکای تجاری", value: "partners" },
	{ label: "دولت و اپراتورها", value: "gov_ops" },
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
	const { getPermittedCompanyTypes, getPermittedServiceIds } = useAccess();

	const services = useQuery(servicesQuery());

	const serviceId = useWatch({ control, name: "serviceId" });
	const serviceCode = useWatch({ control, name: "serviceCode" });
	const companyId = useWatch({ control, name: "companyId" });
	const counterpartyType = useWatch({ control, name: "counterpartyType" });
	const companyType = useWatch({ control, name: "companyType" });
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
	const isPsp = serviceCode === "psp";
	const isTraffic = serviceCode === "traffic";
	const requiresCompanyType = isSms || isPsp || isTraffic;
	const isSmsPartnersFlow = isSms && counterpartyType === "partners";
	const shouldSelectCompany = !isSms || isSmsPartnersFlow;
	const showCompanyTypeSelect = requiresCompanyType && shouldSelectCompany;
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
	const prevCompanyTypeRef = useRef<typeof companyType>(undefined);
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
			resetField("companyType" as any, { defaultValue: null });
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
			setValue("companyType", null, { shouldDirty: true, shouldValidate: false });
		}
	}, [isSms, counterpartyType, setValue]);

	useEffect(() => {
		const prev = prevCompanyTypeRef.current;
		prevCompanyTypeRef.current = companyType;

		if (prev === undefined)
			return;

		if (requiresCompanyType && prev !== companyType) {
			setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
		}
	}, [requiresCompanyType, companyType, setValue]);

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
	const companyTypeOptions = useMemo(
		() => requiresCompanyType && shouldSelectCompany && serviceId
			? getPermittedCompanyTypes("contracts", "create", serviceId).map(item => ({ label: item.value, value: item.key }))
			: [],
		[requiresCompanyType, shouldSelectCompany, serviceId, getPermittedCompanyTypes],
	);

	const companyOptionsDefault = useMemo(
		() =>
			(companies.data?.results ?? []).map((c: any) => ({
				label: c.name,
				value: c.id,
			})),
		[companies.data],
	);

	const companyOptionsByType = useMemo(() => {
		const list = companies.data?.results ?? [];
		if (!companyType)
			return [];
		return list
			.filter((c: any) => companyTypeMatches(c.company_type, companyType))
			.map((c: any) => ({ label: c.name, value: c.id }));
	}, [companies.data, companyType]);

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

	const showCompanySelect = shouldSelectCompany && (!requiresCompanyType || !!companyType);
	const companyTypeLabel = isTraffic ? "نوع شرکت (ترافیک)" : "نوع شرکت";
	const visibleLabels = useMemo(() => {
		const labels = [
			"نوع سرویس",
			"سال شروع",
			"ماه شروع",
			"سال پایان",
			"ماه پایان",
			"شماره قرارداد",
		];
		if (isSms)
			labels.push("طرف قرارداد");
		if (showCompanyTypeSelect)
			labels.push(companyTypeLabel);
		if (showCompanySelect)
			labels.push("شرکت");
		if (isSmsCommission)
			labels.push("نماینده فروش");
		return labels;
	}, [isSms, showCompanyTypeSelect, companyTypeLabel, showCompanySelect, isSmsCommission]);
	const alignedLabelStyle = useContractAlignedLabelWidth(visibleLabels);

	const companyOptions = requiresCompanyType ? companyOptionsByType : companyOptionsDefault;

	const isCompanyDisabled = !serviceId || companies.isLoading || (requiresCompanyType && shouldSelectCompany && !companyType);

	const companyPlaceholder
		= !serviceId
			? "ابتدا سرویس را انتخاب کنید"
			: companies.isLoading
				? "در حال دریافت لیست شرکت‌ها..."
				: requiresCompanyType && shouldSelectCompany && !companyType
					? `ابتدا ${companyTypeLabel} را انتخاب کنید`
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
		if (yearsFromMissing.length > 0)
			return yearsFromMissing.map(year => ({ label: String(year), value: year }));

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
	const compactFormItemStyle = { className: "mb-0" };

	return (
		<Card className="w-full">
			<BasicContent className="w-full">
				<div className="contract-form-aligned-grid contract-form-aligned-grid--two" style={alignedLabelStyle}>
					<ContractAlignedField label="نوع سرویس" labelId="contract-form-label-service">
						<RHFSelect<ContractFormValues, "serviceId", number | null>
							name="serviceId"
							formItemProps={compactFormItemStyle}
							loading={services.isLoading}
							options={serviceOptions}
							selectProps={{
								"allowClear": true,
								"placeholder": "سرویس را انتخاب کنید",
								"aria-labelledby": "contract-form-label-service",
							} as any}
						/>
					</ContractAlignedField>

					{isSms
						? (
							<ContractAlignedField label="طرف قرارداد" labelId="contract-form-label-counterparty">
								<RHFSelect<ContractFormValues, "counterpartyType", "partners" | "gov_ops" | null>
									name="counterpartyType"
									formItemProps={compactFormItemStyle}
									options={COUNTERPARTY_OPTIONS}
									selectProps={{
										"allowClear": true,
										"placeholder": "انتخاب کنید",
										"aria-labelledby": "contract-form-label-counterparty",
									} as any}
								/>
							</ContractAlignedField>
						)
						: null}

					{showCompanyTypeSelect
						? (
							<ContractAlignedField label={companyTypeLabel} labelId="contract-form-label-company-type">
								<RHFSelect<ContractFormValues, "companyType", any>
									name="companyType"
									formItemProps={compactFormItemStyle}
									options={companyTypeOptions}
									selectProps={{
										"allowClear": true,
										"placeholder": "انتخاب کنید",
										"aria-labelledby": "contract-form-label-company-type",
									} as any}
								/>
							</ContractAlignedField>
						)
						: null}

					{showCompanySelect
						? (
							<ContractAlignedField label="شرکت" labelId="contract-form-label-company">
								<RHFSelect<ContractFormValues, "companyId", number | null>
									name="companyId"
									formItemProps={compactFormItemStyle}
									loading={companies.isLoading}
									options={companyOptions as any}
									selectProps={{
										"allowClear": true,
										"disabled": isCompanyDisabled,
										"placeholder": companyPlaceholder,
										"style": isCompanyDisabled ? { cursor: "not-allowed" } : undefined,
										"open": isCompanyDisabled ? false : undefined,
										"aria-labelledby": "contract-form-label-company",
									}}
								/>
							</ContractAlignedField>
						)
						: null}

					{isSmsCommission
						? (
							<ContractAlignedField label="نماینده فروش" labelId="contract-form-label-agent">
								<RHFSelect<ContractFormValues, any, number | null>
									name={"serviceFields.agent" as any}
									formItemProps={compactFormItemStyle}
									loading={smsCommissionAgents.isLoading || smsCommissionAgents.isFetching}
									options={smsCommissionAgentOptions as any}
									selectProps={{
										"allowClear": false,
										"disabled": true,
										"placeholder": smsCommissionAgentPlaceholder,
										"open": false,
										"aria-labelledby": "contract-form-label-agent",
									}}
								/>
							</ContractAlignedField>
						)
						: null}
				</div>

				<div
					className="contract-form-aligned-grid contract-form-aligned-grid--four"
					style={{ ...alignedLabelStyle, marginTop: 12 }}
				>
					<ContractAlignedField label="سال شروع" labelId="contract-form-label-start-year">
						<RHFSelect<ContractFormValues, "startYear", number | null>
							name="startYear"
							formItemProps={compactFormItemStyle}
							loading={isDateOptionsLoading}
							options={startYearOptions}
							selectProps={{
								"allowClear": true,
								"placeholder": "سال",
								"aria-labelledby": "contract-form-label-start-year",
							} as any}
						/>
					</ContractAlignedField>

					<ContractAlignedField label="ماه شروع" labelId="contract-form-label-start-month">
						<RHFSelect<ContractFormValues, "startMonth", number | null>
							name="startMonth"
							formItemProps={compactFormItemStyle}
							loading={isDateOptionsLoading}
							options={startMonthOptions}
							selectProps={{
								"allowClear": true,
								"placeholder": "ماه",
								"aria-labelledby": "contract-form-label-start-month",
							} as any}
						/>
					</ContractAlignedField>

					<ContractAlignedField label="سال پایان" labelId="contract-form-label-end-year">
						<RHFSelect<ContractFormValues, "endYear", number | null>
							name="endYear"
							formItemProps={compactFormItemStyle}
							loading={isDateOptionsLoading}
							options={endYearOptions}
							selectProps={{
								"allowClear": true,
								"placeholder": "سال",
								"aria-labelledby": "contract-form-label-end-year",
							} as any}
						/>
					</ContractAlignedField>

					<ContractAlignedField label="ماه پایان" labelId="contract-form-label-end-month">
						<RHFSelect<ContractFormValues, "endMonth", number | null>
							name="endMonth"
							formItemProps={compactFormItemStyle}
							loading={isDateOptionsLoading}
							options={endMonthOptions}
							selectProps={{
								"allowClear": true,
								"placeholder": "ماه",
								"aria-labelledby": "contract-form-label-end-month",
							} as any}
						/>
					</ContractAlignedField>
				</div>

				<div
					className="contract-form-aligned-grid contract-form-aligned-grid--two"
					style={{ ...alignedLabelStyle, marginTop: 12 }}
				>
					<ContractAlignedField label="شماره قرارداد" labelId="contract-form-label-contract-number">
						<RHFProText<ContractFormValues, "contractNumber">
							name="contractNumber"
							formItemProps={compactFormItemStyle}
							inputProps={{
								"aria-labelledby": "contract-form-label-contract-number",
							} as any}
						/>
					</ContractAlignedField>
				</div>
			</BasicContent>
		</Card>
	);
}
