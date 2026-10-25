import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../../model/contract.form.types";
import { BasicContent } from "#src/components/";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { ContractDataCopyButton } from "#src/features/contract/shared/ui/form/ContractDataCopyButton";
import { useAccess } from "#src/hooks";
import { AlignedFormField, useAlignedLabelWidth } from "#src/shared/ui/aligned-form-field";
import { RHFProCheckbox, RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";
import { toPersianDigits } from "#src/utils";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Steps } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { filterSelectableCompanyTypes, hasSmsVendorCompanyType } from "../../../model/company-type-options";
import { buildFallbackMonthsByYear, getRealStartMonths, getRealStartYears, isRealStartTrigger } from "../../../model/contract-dates";
import { resolveContractGapsScope } from "../../../model/contract-gaps";
import { CONTRACT_NUMBER_MAX_LENGTH } from "../../../model/contract-number";
import { companiesByServiceQuery, contractGapsQuery, servicesQuery, smsCommissionAgentsQuery } from "../../../queries/contract.queries";
import { isTelecomFrameCode } from "../../../services/telecom-frame/telecom-frame.types";
import { useCollocationSlaOptions } from "../../../services/traffic/use-collocation-sla-options";
import { companyTypeMatches, isSmsVendorCompany } from "../../../utils";
import { MONTH_OPTIONS } from "../constants/jalali-date-options";
import { CollocationAddendumFields, TelecomRackCostFields } from "./CollocationAddendumFields";
import { CollocationDatacentersField, CollocationStepPane } from "./CollocationDatacentersField";
import { FixedEndSection } from "./FixedEndSection";

const COUNTERPARTY_OPTIONS = [
	{ labelKey: "contract.counterparty.partners", value: "partners" },
	{ labelKey: "contract.counterparty.govOps", value: "gov_ops" },
] as const;

const COLLOCATION_COUNTERPARTY_OPTIONS = [
	{ labelKey: "contract.counterparty.partners", description: "Business Partner", value: "partners" },
	{ labelKey: "contract.counterparty.govOps", description: "Telecommunication Company of Iran", value: "gov_ops" },
] as const;

const COLLOCATION_COMPANY_TYPE_FALLBACK_OPTIONS = [
	{ label: "COLO", description: "Collocation", value: "COLLOCATION" },
	{ label: "CP", description: "Content Provider", value: "CP" },
] as const;

function AddCompanyLink() {
	const { t } = useTranslation();
	return (
		<Link to="/company/management" className="inline-flex items-center gap-1 whitespace-nowrap text-xs">
			<PlusOutlined />
			{t("contract.create.addCompany")}
		</Link>
	);
}

function isSmsCommissionCode(code: string | null | undefined) {
	const normalized = typeof code === "string" ? code.trim().toLowerCase() : "";
	return normalized === "sms-commission" || normalized === "sms_commission";
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

function mapMonthsToOptions(months: number[]): YearMonthOption[] {
	return months.map((month) => {
		const found = MONTH_OPTIONS.find(option => option.value === month);
		return { label: String(found?.label ?? month), value: month };
	});
}

function addJalaliRangeToMonths(
	monthsByYear: Map<number, number[]>,
	startYear: number,
	startMonth: number,
	endYear: number,
	endMonth: number,
) {
	for (let year = startYear; year <= endYear; year++) {
		const firstMonth = year === startYear ? startMonth : 1;
		const lastMonth = year === endYear ? endMonth : 12;
		const months = new Set(monthsByYear.get(year) ?? []);
		for (let month = firstMonth; month <= lastMonth; month++)
			months.add(month);
		monthsByYear.set(year, [...months].sort((a, b) => a - b));
	}
}

function isJalaliRangeAvailable(
	monthsByYear: Map<number, number[]>,
	startYear: number,
	startMonth: number,
	endYear: number,
	endMonth: number,
) {
	for (let year = startYear; year <= endYear; year++) {
		const firstMonth = year === startYear ? startMonth : 1;
		const lastMonth = year === endYear ? endMonth : 12;
		const availableMonths = new Set(monthsByYear.get(year) ?? []);
		for (let month = firstMonth; month <= lastMonth; month++) {
			if (!availableMonths.has(month))
				return false;
		}
	}
	return true;
}

interface FixedStartSectionProps {
	mode?: "create" | "edit"
	/** ویرایش: تا انتخاب قرارداد، تک‌گزینه‌ها خودکار انتخاب می‌شوند (فرم بارگذاری‌شده دست‌نخورده می‌ماند). */
	awaitingContractSelection?: boolean
	preserveDatesDuringResetRef?: React.MutableRefObject<boolean>
}

interface CollocationChoiceButtonProps {
	label: string
	description?: string
	selected: boolean
	onClick: () => void
}

function CollocationChoiceButton({
	label,
	description,
	selected,
	onClick,
}: CollocationChoiceButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={[
				"min-h-[78px] rounded-xl border px-5 py-4 text-right transition-colors",
				"bg-transparent hover:border-primary",
				selected ? "border-primary text-primary" : "border-[var(--ant-color-border)] text-[var(--ant-color-text)]",
			].join(" ")}
		>
			<span className="block text-base font-semibold">{label}</span>
			{description
				? <span className="mt-1 block text-sm text-[var(--ant-color-text-secondary)]">{description}</span>
				: null}
		</button>
	);
}

export function FixedStartSection({ mode = "create", awaitingContractSelection = false, preserveDatesDuringResetRef }: FixedStartSectionProps) {
	const autoSelectSingle = mode !== "edit" || awaitingContractSelection;
	const { t } = useTranslation();
	const { setValue, control, trigger, formState, resetField } = useFormContext<ContractFormValues>();
	const { getPermittedCompanyTypes, getPermittedServiceIds } = useAccess();
	const permissionAction = mode === "edit" ? "update" : "create";
	const [collocationStep, setCollocationStep] = useState(0);

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
	const originalEditRangeRef = useRef<{
		startYear: number
		startMonth: number
		endYear: number
		endMonth: number
	} | null>(null);
	const dateFieldsAreDirty = Boolean(
		formState.dirtyFields.startYear
		|| formState.dirtyFields.startMonth
		|| formState.dirtyFields.endYear
		|| formState.dirtyFields.endMonth,
	);
	if (
		mode === "edit"
		&& !dateFieldsAreDirty
		&& startYear != null
		&& startMonth != null
		&& endYear != null
		&& endMonth != null
	) {
		originalEditRangeRef.current = { startYear, startMonth, endYear, endMonth };
	}
	const selectedAgentId = useWatch({ control, name: "serviceFields.agent" as any });
	const serviceIsOfficial = useWatch({ control, name: "serviceFields.isOfficial" as any }) as boolean | null | undefined;
	const collocationPartnerType = useWatch({ control, name: "serviceFields.collocationPartnerType" as any }) as string | null | undefined;

	const permittedCreateServiceIdList = getPermittedServiceIds("contracts", permissionAction);
	const permittedCreateServiceIds = useMemo(
		() => new Set(permittedCreateServiceIdList),
		[permittedCreateServiceIdList.join(",")],
	);

	const companies = useQuery(companiesByServiceQuery(serviceId));

	const isSms = serviceCode === "sms";
	const isPsp = serviceCode === "psp";
	const isTraffic = serviceCode === "traffic";
	const isSalesAgency = serviceCode === "sales_agency" || serviceCode === "sales-agency";
	const isCollocation = isTraffic && String(companyType ?? "").trim().toUpperCase() === "COLLOCATION";
	const isTelecomCollocation = isCollocation && counterpartyType === "gov_ops";
	const isTelecomFrame = isTelecomFrameCode(serviceCode);
	const requiresCompanyType = isSms || isPsp || isTraffic || isSalesAgency || isTelecomFrame;
	const isSmsPartnersFlow = isSms && counterpartyType === "partners";
	const shouldSelectCompany = !isSms || isSmsPartnersFlow;
	const showCompanyTypeSelect = requiresCompanyType && shouldSelectCompany;
	const isSmsCommission = isSmsCommissionCode(serviceCode);
	const smsCommissionAgents = useQuery(smsCommissionAgentsQuery(isSmsCommission && !!companyId));
	const gapsScope = resolveContractGapsScope({ serviceCode, counterpartyType, companyId, companyType });
	const contractGaps = useQuery(contractGapsQuery({ serviceId, ...gapsScope }));

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
			if (preserveDatesDuringResetRef?.current)
				return;
			setValue("startYear", null, { shouldDirty: true, shouldValidate: false });
			setValue("startMonth", null, { shouldDirty: true, shouldValidate: false });
			setValue("endYear", null, { shouldDirty: true, shouldValidate: false });
			setValue("endMonth", null, { shouldDirty: true, shouldValidate: false });
			if (mode === "edit") {
				resetField("contractNumber", { defaultValue: "" });
				resetField("description", { defaultValue: "" });
				resetField("serviceFields", { defaultValue: {} as any });
			}
		}
	}, [companyId, mode, resetField, setValue, preserveDatesDuringResetRef]);

	useEffect(() => {
		const prev = prevStartYearRef.current;
		prevStartYearRef.current = startYear;

		if (prev === undefined)
			return;

		if (prev !== startYear) {
			if (preserveDatesDuringResetRef?.current)
				return;
			setValue("startMonth", null, { shouldDirty: true, shouldValidate: false });
		}
	}, [startYear, setValue, preserveDatesDuringResetRef]);

	useEffect(() => {
		const prev = prevEndYearRef.current;
		prevEndYearRef.current = endYear;

		if (prev === undefined)
			return;

		if (prev !== endYear) {
			if (preserveDatesDuringResetRef?.current)
				return;
			setValue("endMonth", null, { shouldDirty: true, shouldValidate: false });
		}
	}, [endYear, setValue, preserveDatesDuringResetRef]);

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
	const permittedCompanyTypes = useMemo(
		() => (serviceId ? getPermittedCompanyTypes("contracts", permissionAction, serviceId) : []),
		[serviceId, permissionAction, getPermittedCompanyTypes],
	);
	// طرف قرارداد SMS از روی نوع‌های مجاز تعیین می‌شود (VENDOR = اپراتورها و دولت، بقیه = شرکای تجاری)
	const smsPartyOptions = useMemo(() => {
		const options = COUNTERPARTY_OPTIONS.filter(option => option.value === "gov_ops"
			? hasSmsVendorCompanyType(permittedCompanyTypes)
			: filterSelectableCompanyTypes("sms", permittedCompanyTypes).length > 0);
		return (options.length > 0 ? options : COUNTERPARTY_OPTIONS).map(option => ({ label: t(option.labelKey), value: option.value }));
	}, [permittedCompanyTypes, t]);
	const companyTypeOptions = useMemo(() => {
		if (!requiresCompanyType || !shouldSelectCompany || !serviceId)
			return [];

		return filterSelectableCompanyTypes(serviceCode, permittedCompanyTypes)
			.map(item => ({ label: item.value, value: item.key }));
	}, [requiresCompanyType, shouldSelectCompany, serviceId, permittedCompanyTypes, serviceCode]);
	const collocationCompanyTypeOptions = useMemo(() => {
		const allowedValues = new Set(COLLOCATION_COMPANY_TYPE_FALLBACK_OPTIONS.map(option => option.value));
		const permittedOptions = companyTypeOptions
			.filter(option => allowedValues.has(String(option.value).toUpperCase() as any))
			.map((option) => {
				const normalizedValue = String(option.value).toUpperCase();
				const fallback = COLLOCATION_COMPANY_TYPE_FALLBACK_OPTIONS.find(item => item.value === normalizedValue);
				return {
					label: fallback?.label ?? String(option.label),
					description: fallback?.description,
					value: normalizedValue,
				};
			});

		return permittedOptions.length > 0 ? permittedOptions : [...COLLOCATION_COMPANY_TYPE_FALLBACK_OPTIONS];
	}, [companyTypeOptions]);

	const companyOptionsDefault = useMemo(
		() =>
			(companies.data?.results ?? [])
				.filter((c: any) => !isSmsVendorCompany(c))
				.map((c: any) => ({
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
			.filter((c: any) => !isSmsVendorCompany(c) && companyTypeMatches(c.company_type, companyType))
			.map((c: any) => ({ label: c.name, value: c.id }));
	}, [companies.data, companyType]);
	const collocationCompanyOptions = useMemo(() => {
		const list = companies.data?.results ?? [];
		// تا نوع شریک انتخاب نشده شرکتی پیشنهاد نمی‌شود (مثل old)
		const targetType = collocationPartnerType;
		if (!targetType)
			return [];
		return list
			.filter((c: any) => !isSmsVendorCompany(c) && companyTypeMatches(c.company_type, targetType))
			.map((c: any) => ({ label: c.name, value: c.id }));
	}, [companies.data, collocationPartnerType]);

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

	const slaOptions = useCollocationSlaOptions();

	const smsCommissionAgentPlaceholder
		= !companyId
			? t("contract.field.salesAgentSelectCompanyFirst")
			: smsCommissionAgents.isLoading
				? t("contract.field.salesAgentLoading")
				: smsCommissionAgentOptions.length > 0
					? t("contract.field.salesAgentAuto")
					: t("contract.field.salesAgentNotFound");

	useEffect(() => {
		// تا رسیدن لیست نماینده‌ها مقدار بارگذاری‌شده (ویرایش) پاک و فرم dirty نمی‌شود
		if (!isSmsCommission || !smsCommissionAgents.isSuccess)
			return;

		// در ویرایش، انتخاب خودکار بدون دخالت کاربر فرم را dirty نمی‌کند
		const shouldDirty = mode !== "edit";
		if (!companyId || smsCommissionAgentOptions.length === 0) {
			if (selectedAgentId != null)
				setValue("serviceFields.agent" as any, null, { shouldDirty, shouldValidate: false });
			return;
		}

		const hasSelected = smsCommissionAgentOptions.some(option => option.value === selectedAgentId);
		if (!hasSelected) {
			setValue("serviceFields.agent" as any, smsCommissionAgentOptions[0].value, {
				shouldDirty,
				shouldValidate: false,
			});
		}
	}, [isSmsCommission, smsCommissionAgents.isSuccess, mode, companyId, smsCommissionAgentOptions, selectedAgentId, setValue]);

	const showCompanySelect = shouldSelectCompany && (!requiresCompanyType || !!companyType) && !isCollocation;
	const companyTypeLabel = isSalesAgency ? t("contract.field.salesAgencyType") : isTraffic ? t("contract.field.trafficCompanyType") : isSms ? t("contract.field.smsCompanyType") : t("contract.field.companyType");
	const companyLabel = isSalesAgency ? t("contract.field.companyName") : t("contract.formLabel.companyName");
	const visibleLabels = useMemo(() => {
		const labels = [
			t("contract.field.serviceType"),
			t("contract.formLabel.startYear"),
			t("contract.formLabel.startMonth"),
			t("contract.formLabel.endYear"),
			t("contract.formLabel.endMonth"),
			t("contract.list.column.contractNumber"),
		];
		if (isSms)
			labels.push(t("contract.field.counterparty"));
		if (showCompanyTypeSelect)
			labels.push(companyTypeLabel);
		if (showCompanySelect)
			labels.push(companyLabel);
		if (isSmsCommission)
			labels.push(t("contract.field.salesAgent"));
		if (isCollocation)
			labels.push("SLA");
		if (isRealStartTrigger(startYear, startMonth)) {
			labels.push(t("contract.field.realStartYear"));
			labels.push(t("contract.field.realStartMonth"));
		}
		return labels;
	}, [isSms, showCompanyTypeSelect, companyTypeLabel, showCompanySelect, companyLabel, isSmsCommission, isCollocation, startYear, startMonth, t]);
	const alignedLabelStyle = useAlignedLabelWidth(visibleLabels);

	const companyOptions = requiresCompanyType ? companyOptionsByType : companyOptionsDefault;

	const isCompanyDisabled = !serviceId || companies.isLoading || (requiresCompanyType && shouldSelectCompany && !companyType);

	const companyPlaceholder
		= !serviceId
			? t("contract.companyPlaceholder.selectServiceFirst")
			: companies.isLoading
				? t("contract.companyPlaceholder.loading")
				: requiresCompanyType && shouldSelectCompany && !companyType
					? t("contract.companyPlaceholder.selectTypeFirst", { type: companyTypeLabel })
					: t("contract.companyPlaceholder.select");

	const missingMonthsByYear = useMemo(() => {
		const raw = contractGaps.data?.missing_months_by_year;
		const output = raw ? new Map<number, number[]>() : buildFallbackMonthsByYear();

		Object.entries(raw ?? {}).forEach(([yearStr, months]) => {
			const year = Number(yearStr);
			if (!Number.isInteger(year))
				return;
			output.set(year, normalizeMonthList(months));
		});

		const originalRange = originalEditRangeRef.current;
		if (mode === "edit" && originalRange) {
			addJalaliRangeToMonths(
				output,
				originalRange.startYear,
				originalRange.startMonth,
				originalRange.endYear,
				originalRange.endMonth,
			);
		}

		return output;
	}, [contractGaps.data, mode, startYear, startMonth, endYear, endMonth, dateFieldsAreDirty]);

	useEffect(() => {
		if (!preserveDatesDuringResetRef?.current || !contractGaps.data)
			return;

		if (contractGaps.isLoading || contractGaps.isFetching)
			return;
		if (contractGaps.isError)
			return;

		const hasCompleteRange = startYear != null && startMonth != null && endYear != null && endMonth != null;
		const rangeIsAvailable = hasCompleteRange && isJalaliRangeAvailable(missingMonthsByYear, startYear, startMonth, endYear, endMonth);

		if (!rangeIsAvailable) {
			setValue("startYear", null, { shouldDirty: true, shouldValidate: false });
			setValue("startMonth", null, { shouldDirty: true, shouldValidate: false });
			setValue("endYear", null, { shouldDirty: true, shouldValidate: false });
			setValue("endMonth", null, { shouldDirty: true, shouldValidate: false });
		}

		preserveDatesDuringResetRef.current = false;
	}, [
		contractGaps.data,
		contractGaps.isLoading,
		contractGaps.isFetching,
		missingMonthsByYear,
		startYear,
		startMonth,
		endYear,
		endMonth,
		setValue,
		preserveDatesDuringResetRef,
	]);

	const baseYearOptions = useMemo(() => {
		const yearsFromMissing = Array.from(missingMonthsByYear.keys()).sort((a, b) => a - b);
		return yearsFromMissing.map(year => ({ label: String(year), value: year }));
	}, [missingMonthsByYear]);

	const baseStartMonthOptions = useMemo(() => {
		if (startYear == null)
			return [];

		const months = missingMonthsByYear.get(startYear);
		if (months && months.length > 0)
			return mapMonthsToOptions(months);
		return [];
	}, [startYear, missingMonthsByYear]);

	const baseEndMonthOptions = useMemo(() => {
		if (endYear == null)
			return [];

		const months = missingMonthsByYear.get(endYear);
		if (months && months.length > 0)
			return mapMonthsToOptions(months);
		return [];
	}, [endYear, missingMonthsByYear]);

	const startYearOptions = useMemo(
		() => baseYearOptions,
		[baseYearOptions],
	);
	const endYearOptions = useMemo(
		() => baseYearOptions,
		[baseYearOptions],
	);
	const startMonthOptions = useMemo(
		() => baseStartMonthOptions,
		[baseStartMonthOptions],
	);
	const endMonthOptions = useMemo(
		() => baseEndMonthOptions,
		[baseEndMonthOptions],
	);
	const realStartYear = useWatch({ control, name: "serviceFields.realStartYear" as any }) as number | null | undefined;
	const realStartYearOptions = useMemo(
		() => getRealStartYears().map(year => ({ label: String(year), value: year })),
		[],
	);
	const selectedRealStartMonth = useWatch({ control, name: "serviceFields.realStartMonth" as any }) as number | null | undefined;
	const realStartMonthOptions = useMemo(() => mapMonthsToOptions(getRealStartMonths(realStartYear)), [realStartYear]);
	const shouldShowRealStartFields = isRealStartTrigger(startYear, startMonth);

	useEffect(() => {
		if (realStartYear != null && selectedRealStartMonth != null && !getRealStartMonths(realStartYear).includes(selectedRealStartMonth))
			setValue("serviceFields.realStartMonth" as any, null, { shouldDirty: true, shouldValidate: false });
	}, [realStartYear, selectedRealStartMonth, setValue]);

	useEffect(() => {
		if (shouldShowRealStartFields)
			return;

		setValue("serviceFields.realStartYear" as any, null, { shouldDirty: false, shouldValidate: false });
		setValue("serviceFields.realStartMonth" as any, null, { shouldDirty: false, shouldValidate: false });
	}, [shouldShowRealStartFields, setValue]);

	const showCollocationGapHint = (
		isCollocation
		&& !isTelecomCollocation
		&& !!serviceId
		&& !!contractGaps.data
		&& !contractGaps.isFetching
		&& ![...missingMonthsByYear.values()].some(months => months.length > 0)
	);
	const isDateOptionsLoading = contractGaps.isLoading || contractGaps.isFetching;
	const compactFormItemStyle = { className: "mb-0" };
	const selectedCollocationPartner = collocationCompanyTypeOptions.find(option => option.value === collocationPartnerType);
	const selectedCollocationCompany = collocationCompanyOptions.find(option => option.value === companyId);
	const collocationSteps = isTelecomCollocation
		? [
			{ title: t("contract.field.collocationStepCounterparty") },
			{ title: t("contract.field.contractInfo") },
		]
		: [
			{ title: t("contract.field.collocationStepCounterparty") },
			{ title: t("contract.field.partnerType") },
			{ title: t("contract.field.selectCompany") },
			{ title: t("contract.field.datacenters") },
		];
	const collocationMaxStep = isTelecomCollocation
		? 1
		: companyId != null
			? 3
			: collocationPartnerType
				? 2
				: counterpartyType
					? 1
					: 0;
	const activeCollocationStep = Math.min(collocationStep, collocationMaxStep);
	const canGoNextInCollocationStep = isTelecomCollocation
		? counterpartyType != null
		: activeCollocationStep === 0
			? counterpartyType != null
			: activeCollocationStep === 1
				? collocationPartnerType != null
				: activeCollocationStep === 2
					? companyId != null
					: true;

	function goToNextCollocationStep() {
		if (!canGoNextInCollocationStep)
			return;
		setCollocationStep(current => Math.min(current + 1, collocationSteps.length - 1));
	}

	function goToPreviousCollocationStep() {
		setCollocationStep(current => Math.max(current - 1, 0));
	}

	function goToCollocationStep(step: number) {
		const normalizedStep = Math.max(0, Math.min(step, collocationMaxStep));
		setCollocationStep(normalizedStep);
	}

	function renderRealStartFields(idSuffix: string) {
		return (
			<CollocationStepPane active={shouldShowRealStartFields}>
				<div className="mt-4 aligned-form-grid aligned-form-grid--two aligned-form-date-grid" style={alignedLabelStyle}>
					<AlignedFormField label={t("contract.field.realStartYear")} labelId={`contract-form-label-real-start-year-${idSuffix}`}>
						<RHFSelect<ContractFormValues, any, number | null>
							name={"serviceFields.realStartYear" as any}
							formItemProps={compactFormItemStyle}
							options={realStartYearOptions}
							selectProps={{
								"allowClear": true,
								"placeholder": t("contract.placeholder.year"),
								"aria-labelledby": `contract-form-label-real-start-year-${idSuffix}`,
							} as any}
						/>
					</AlignedFormField>

					<AlignedFormField label={t("contract.field.realStartMonth")} labelId={`contract-form-label-real-start-month-${idSuffix}`}>
						<RHFSelect<ContractFormValues, any, number | null>
							name={"serviceFields.realStartMonth" as any}
							formItemProps={compactFormItemStyle}
							options={realStartMonthOptions}
							selectProps={{
								"allowClear": true,
								"placeholder": t("contract.placeholder.month"),
								"aria-labelledby": `contract-form-label-real-start-month-${idSuffix}`,
							} as any}
						/>
					</AlignedFormField>
				</div>
			</CollocationStepPane>
		);
	}

	return (
		<SectionCard title={t("contract.field.basicInfo")} className="w-full">
			<BasicContent className="w-full">
				<div className="aligned-form-grid aligned-form-grid--two" style={alignedLabelStyle}>
					<AlignedFormField label={t("contract.field.serviceType")} labelId="contract-form-label-service">
						<RHFSelect<ContractFormValues, "serviceId", number | null>
							name="serviceId"
							formItemProps={compactFormItemStyle}
							loading={services.isLoading}
							options={serviceOptions}
							autoSelectSingle={autoSelectSingle}
							onValueChange={() => {
								setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
								setCollocationStep(0);
							}}
							selectProps={{
								"allowClear": true,
								"placeholder": t("contract.field.selectService"),
								"aria-labelledby": "contract-form-label-service",
							} as any}
						/>
					</AlignedFormField>

					{isSms
						? (
							<AlignedFormField label={t("contract.field.counterparty")} labelId="contract-form-label-counterparty">
								<RHFSelect<ContractFormValues, "counterpartyType", "partners" | "gov_ops" | null>
									name="counterpartyType"
									formItemProps={compactFormItemStyle}
									options={smsPartyOptions}
									autoSelectSingle={autoSelectSingle}
									selectProps={{
										"allowClear": true,
										"placeholder": t("contract.placeholder.select"),
										"aria-labelledby": "contract-form-label-counterparty",
									} as any}
								/>
							</AlignedFormField>
						)
						: null}

					{showCompanyTypeSelect
						? (
							<AlignedFormField label={companyTypeLabel} labelId="contract-form-label-company-type">
								<RHFSelect<ContractFormValues, "companyType", any>
									name="companyType"
									formItemProps={compactFormItemStyle}
									options={companyTypeOptions}
									autoSelectSingle={autoSelectSingle}
									onValueChange={() => {
										setCollocationStep(0);
										setValue("serviceFields.collocationPartnerType" as any, null, {
											shouldDirty: true,
											shouldValidate: false,
										});
										setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
									}}
									selectProps={{
										"allowClear": true,
										"placeholder": t("contract.placeholder.select"),
										"aria-labelledby": "contract-form-label-company-type",
									} as any}
								/>
							</AlignedFormField>
						)
						: null}

					{showCompanySelect
						? (
							<AlignedFormField label={companyLabel} labelId="contract-form-label-company">
								<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
									<div className="min-w-0 flex-1 basis-48">
										<RHFSelect<ContractFormValues, "companyId", number | null>
											name="companyId"
											formItemProps={compactFormItemStyle}
											loading={companies.isLoading}
											options={companyOptions as any}
											autoSelectSingle={autoSelectSingle}
											selectProps={{
												"allowClear": true,
												"disabled": isCompanyDisabled,
												"placeholder": companyPlaceholder,
												"style": isCompanyDisabled ? { cursor: "not-allowed" } : undefined,
												"open": isCompanyDisabled ? false : undefined,
												"aria-labelledby": "contract-form-label-company",
											}}
										/>
									</div>
									{mode === "edit" ? null : <AddCompanyLink />}
								</div>
							</AlignedFormField>
						)
						: null}

					{isSmsCommission
						? (
							<AlignedFormField label={t("contract.field.salesAgent")} labelId="contract-form-label-agent">
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
							</AlignedFormField>
						)
						: null}
				</div>

				{isCollocation
					? (
						<Card
							bordered
							className="mt-4 rounded-2xl [&_.ant-pro-card-body]:p-5"
						>
							<Steps
								current={activeCollocationStep}
								items={collocationSteps}
								onChange={goToCollocationStep}
								responsive
								className="mb-8"
							/>

							<CollocationStepPane active={activeCollocationStep === 0}>
								<div className="grid gap-3 md:grid-cols-2">
									{COLLOCATION_COUNTERPARTY_OPTIONS.map(option => (
										<CollocationChoiceButton
											key={option.value}
											label={t(option.labelKey)}
											description={option.description}
											selected={counterpartyType === option.value}
											onClick={() => {
												setValue("counterpartyType", option.value, { shouldDirty: true, shouldValidate: true });
												setValue("serviceFields.collocationPartnerType" as any, null, { shouldDirty: true, shouldValidate: false });
												setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
											}}
										/>
									))}
								</div>
							</CollocationStepPane>

							<CollocationStepPane active={!isTelecomCollocation && activeCollocationStep === 1}>
								<div className="grid gap-3 md:grid-cols-2">
									{collocationCompanyTypeOptions.map(option => (
										<CollocationChoiceButton
											key={option.value}
											label={option.label}
											description={option.description}
											selected={collocationPartnerType === option.value}
											onClick={() => {
												setValue("serviceFields.collocationPartnerType" as any, option.value, { shouldDirty: true, shouldValidate: true });
												setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
											}}
										/>
									))}
								</div>
							</CollocationStepPane>

							<CollocationStepPane active={!isTelecomCollocation && activeCollocationStep === 2}>
								<div className="aligned-form-grid aligned-form-grid--two" style={alignedLabelStyle}>
									<AlignedFormField label={t("contract.formLabel.companyName")} labelId="contract-form-label-company">
										<RHFSelect<ContractFormValues, "companyId", number | null>
											name="companyId"
											formItemProps={compactFormItemStyle}
											loading={companies.isLoading}
											options={collocationCompanyOptions}
											autoSelectSingle={autoSelectSingle && !isTelecomCollocation && activeCollocationStep === 2}
											selectProps={{
												"allowClear": true,
												"disabled": !collocationPartnerType || companies.isLoading,
												"placeholder": !collocationPartnerType ? t("contract.field.selectPartnerTypeFirst") : companyPlaceholder,
												"style": !collocationPartnerType || companies.isLoading ? { cursor: "not-allowed" } : undefined,
												"open": !collocationPartnerType || companies.isLoading ? false : undefined,
												"aria-labelledby": "contract-form-label-company",
											}}
										/>
									</AlignedFormField>
								</div>
							</CollocationStepPane>

							<CollocationStepPane active={isTelecomCollocation && activeCollocationStep === 1}>
								<div className="flex flex-col gap-5">
									<Card bordered className="rounded-xl">
										<div className="text-right text-sm font-semibold text-[var(--ant-color-text)]">
											{t("contract.counterparty.govOps")}
										</div>
									</Card>

									<div>
										<div className="mb-3 text-right">
											<div className="text-base font-semibold">{t("contract.field.contractInfo")}</div>
											<div className="text-sm text-[var(--ant-color-text-secondary)]">{t("contract.field.contractInfoHint")}</div>
										</div>
										<div className="aligned-form-grid aligned-form-grid--two" style={alignedLabelStyle}>
											<AlignedFormField
												label={t("contract.list.column.contractNumber")}
												labelId="contract-form-label-contract-number-telecom"
											>
												<RHFProText<ContractFormValues, "contractNumber">
													name="contractNumber"
													formItemProps={compactFormItemStyle}
													transformValue={toPersianDigits}
													inputProps={{
														"maxLength": CONTRACT_NUMBER_MAX_LENGTH,
														"placeholder": t("contract.field.contractNumberExample"),
														"aria-labelledby": "contract-form-label-contract-number-telecom",
													}}
												/>
											</AlignedFormField>
											<AlignedFormField label="" className="aligned-form-field--copy-button" labelId="contract-form-label-copy-contract-data-collocation">
												<ContractDataCopyButton />
											</AlignedFormField>
										</div>
									</div>

									<div>
										<div className="mb-3 text-right">
											<div className="text-base font-semibold">{t("contract.field.period")}</div>
											<div className="text-sm text-[var(--ant-color-text-secondary)]">{t("contract.field.periodHint")}</div>
										</div>
										<div
											className="aligned-form-grid aligned-form-grid--four aligned-form-date-grid"
											style={alignedLabelStyle}
										>
											<AlignedFormField label={t("contract.formLabel.startYear")} labelId="contract-form-label-start-year-telecom">
												<RHFSelect<ContractFormValues, "startYear", number | null>
													name="startYear"
													formItemProps={compactFormItemStyle}
													loading={isDateOptionsLoading}
													options={startYearOptions}
													selectProps={{
														"allowClear": true,
														"placeholder": t("contract.placeholder.year"),
														"placement": "bottomRight",
														"dropdownAlign": { overflow: { adjustY: false } },
														"aria-labelledby": "contract-form-label-start-year-telecom",
													} as any}
												/>
											</AlignedFormField>

											<AlignedFormField label={t("contract.formLabel.startMonth")} labelId="contract-form-label-start-month-telecom">
												<RHFSelect<ContractFormValues, "startMonth", number | null>
													name="startMonth"
													formItemProps={compactFormItemStyle}
													loading={isDateOptionsLoading}
													options={startMonthOptions}
													selectProps={{
														"allowClear": true,
														"placeholder": t("contract.placeholder.month"),
														"placement": "bottomRight",
														"dropdownAlign": { overflow: { adjustY: false } },
														"aria-labelledby": "contract-form-label-start-month-telecom",
													} as any}
												/>
											</AlignedFormField>

											<AlignedFormField label={t("contract.formLabel.endYear")} labelId="contract-form-label-end-year-telecom">
												<RHFSelect<ContractFormValues, "endYear", number | null>
													name="endYear"
													formItemProps={compactFormItemStyle}
													loading={isDateOptionsLoading}
													options={endYearOptions}
													selectProps={{
														"allowClear": true,
														"placeholder": t("contract.placeholder.year"),
														"placement": "bottomRight",
														"dropdownAlign": { overflow: { adjustY: false } },
														"aria-labelledby": "contract-form-label-end-year-telecom",
													} as any}
												/>
											</AlignedFormField>

											<AlignedFormField label={t("contract.formLabel.endMonth")} labelId="contract-form-label-end-month-telecom">
												<RHFSelect<ContractFormValues, "endMonth", number | null>
													name="endMonth"
													formItemProps={compactFormItemStyle}
													loading={isDateOptionsLoading}
													options={endMonthOptions}
													selectProps={{
														"allowClear": true,
														"placeholder": t("contract.placeholder.month"),
														"placement": "bottomRight",
														"dropdownAlign": { overflow: { adjustY: false } },
														"aria-labelledby": "contract-form-label-end-month-telecom",
													} as any}
												/>
											</AlignedFormField>
										</div>
										{renderRealStartFields("telecom")}
									</div>

									<div>
										<div className="mb-3 text-right">
											<div className="text-base font-semibold">{t("contract.field.financialDetails")}</div>
											<div className="text-sm text-[var(--ant-color-text-secondary)]">{t("contract.field.telecomFinancialHint")}</div>
										</div>
										<div style={alignedLabelStyle}>
											<TelecomRackCostFields basePath="serviceFields" />
										</div>
									</div>
								</div>
							</CollocationStepPane>

							<CollocationStepPane active={!isTelecomCollocation && activeCollocationStep === 3}>
								<div className="flex flex-col gap-5">
									<Card bordered className="rounded-xl">
										<div className="flex items-center justify-between gap-3 text-sm">
											<div className="flex flex-col gap-1 text-right">
												<span>
													{t("contract.field.partnerTypeLabel")}
													{" "}
													<b>{selectedCollocationPartner?.label ?? "-"}</b>
												</span>
												<span>
													{t("contract.field.companyNameLabel")}
													{" "}
													<b>{selectedCollocationCompany?.label ?? "-"}</b>
												</span>
											</div>
											<Button type="link" onClick={() => setCollocationStep(1)}>
												{t("contract.field.change")}
											</Button>
										</div>
									</Card>

									<div>
										<div className="mb-3 text-right">
											<div className="text-base font-semibold">{t("contract.field.contractInfo")}</div>
											<div className="text-sm text-[var(--ant-color-text-secondary)]">{t("contract.field.contractInfoHint")}</div>
										</div>
										<div className="aligned-form-grid aligned-form-grid--two" style={alignedLabelStyle}>
											<AlignedFormField
												label={t("contract.list.column.contractNumber")}
												labelId="contract-form-label-contract-number"
											>
												<RHFProText<ContractFormValues, "contractNumber">
													name="contractNumber"
													formItemProps={compactFormItemStyle}
													transformValue={toPersianDigits}
													inputProps={{
														"maxLength": CONTRACT_NUMBER_MAX_LENGTH,
														"placeholder": t("contract.field.contractNumberExample"),
														"aria-labelledby": "contract-form-label-contract-number",
													}}
												/>
											</AlignedFormField>
											<AlignedFormField label="" className="aligned-form-field--copy-button" labelId="contract-form-label-copy-contract-data-collocation-main">
												<ContractDataCopyButton />
											</AlignedFormField>
										</div>
									</div>

									<div>
										<div className="mb-3 text-right">
											<div className="text-base font-semibold">{t("contract.field.period")}</div>
											<div className="text-sm text-[var(--ant-color-text-secondary)]">{t("contract.field.periodHint")}</div>
										</div>
										<div
											className="aligned-form-grid aligned-form-grid--four aligned-form-date-grid"
											style={alignedLabelStyle}
										>
											<AlignedFormField label={t("contract.formLabel.startYear")} labelId="contract-form-label-start-year">
												<RHFSelect<ContractFormValues, "startYear", number | null>
													name="startYear"
													formItemProps={compactFormItemStyle}
													loading={isDateOptionsLoading}
													options={startYearOptions}
													selectProps={{
														"allowClear": true,
														"placeholder": t("contract.placeholder.year"),
														"placement": "bottomRight",
														"dropdownAlign": { overflow: { adjustY: false } },
														"aria-labelledby": "contract-form-label-start-year",
													} as any}
												/>
											</AlignedFormField>

											<AlignedFormField label={t("contract.formLabel.startMonth")} labelId="contract-form-label-start-month">
												<RHFSelect<ContractFormValues, "startMonth", number | null>
													name="startMonth"
													formItemProps={compactFormItemStyle}
													loading={isDateOptionsLoading}
													options={startMonthOptions}
													selectProps={{
														"allowClear": true,
														"placeholder": t("contract.placeholder.month"),
														"placement": "bottomRight",
														"dropdownAlign": { overflow: { adjustY: false } },
														"aria-labelledby": "contract-form-label-start-month",
													} as any}
												/>
											</AlignedFormField>

											<AlignedFormField label={t("contract.formLabel.endYear")} labelId="contract-form-label-end-year">
												<RHFSelect<ContractFormValues, "endYear", number | null>
													name="endYear"
													formItemProps={compactFormItemStyle}
													loading={isDateOptionsLoading}
													options={endYearOptions}
													selectProps={{
														"allowClear": true,
														"placeholder": t("contract.placeholder.year"),
														"placement": "bottomRight",
														"dropdownAlign": { overflow: { adjustY: false } },
														"aria-labelledby": "contract-form-label-end-year",
													} as any}
												/>
											</AlignedFormField>

											<AlignedFormField label={t("contract.formLabel.endMonth")} labelId="contract-form-label-end-month">
												<RHFSelect<ContractFormValues, "endMonth", number | null>
													name="endMonth"
													formItemProps={compactFormItemStyle}
													loading={isDateOptionsLoading}
													options={endMonthOptions}
													selectProps={{
														"allowClear": true,
														"placeholder": t("contract.placeholder.month"),
														"placement": "bottomRight",
														"dropdownAlign": { overflow: { adjustY: false } },
														"aria-labelledby": "contract-form-label-end-month",
													} as any}
												/>
											</AlignedFormField>
										</div>
										{showCollocationGapHint
											? (
												<Alert
													className="mt-4"
													type="info"
													showIcon
													message={t(collocationPartnerType === "CP" ? "contract.gapHint.cp" : "contract.gapHint.colo")}
												/>
											)
											: null}
										{renderRealStartFields("collocation")}
									</div>

									<div>
										<div className="mb-3 text-right">
											<div className="text-base font-semibold">{t("contract.field.financialDetails")}</div>
											<div className="text-sm text-[var(--ant-color-text-secondary)]">{t("contract.field.partnersFinancialHint")}</div>
										</div>
										<Card bordered className="rounded-xl">
											<div className="aligned-form-grid aligned-form-grid--two mb-5" style={alignedLabelStyle}>
												<AlignedFormField label="SLA" labelId="contract-form-label-sla">
													<RHFSelect<ContractFormValues, any, string | null>
														name={"serviceFields.sla" as any}
														formItemProps={compactFormItemStyle}
														options={slaOptions}
														selectProps={{
															"allowClear": true,
															"placeholder": t("contract.collocation.slaPlaceholder"),
															"aria-labelledby": "contract-form-label-sla",
														} as any}
													/>
												</AlignedFormField>
											</div>
											<div className="mb-3 text-right text-base font-semibold">{t("contract.field.contractDatacenters")}</div>
											<div className="flex flex-col gap-5">
												<CollocationDatacentersField
													name="serviceFields.datacenters"
													selectName="serviceFields.datacenter"
													partnerType={collocationPartnerType}
												/>
											</div>
										</Card>
									</div>
								</div>
							</CollocationStepPane>

							<div className="mt-4 flex items-center justify-between border-t border-[var(--ant-color-border)] pt-4">
								{activeCollocationStep > 0
									? (
										<Button onClick={goToPreviousCollocationStep}>
											{t("contract.field.previous")}
										</Button>
									)
									: <span />}
								{activeCollocationStep < collocationSteps.length - 1
									? (
										<Button
											type="primary"
											onClick={goToNextCollocationStep}
											disabled={!canGoNextInCollocationStep}
										>
											{t("contract.field.next")}
										</Button>
									)
									: null}
							</div>

							<div className="mt-5 border-t border-[var(--ant-color-border)] pt-5">
								<ContractAddendaSection<ContractFormValues>
									title={t("contract.addenda.title")}
									name={"serviceFields.addenda" as ArrayPath<ContractFormValues>}
									contractTypeTitle=""
									contractTypeFieldKey="contractPricing"
									renderAddendumFields={base => (
										<CollocationAddendumFields base={base} isTelecom={isTelecomCollocation} partnerType={collocationPartnerType} />
									)}
									contractStartYearPath={"startYear" as Path<ContractFormValues>}
									contractStartMonthPath={"startMonth" as Path<ContractFormValues>}
									contractEndYearPath={"endYear" as Path<ContractFormValues>}
									contractEndMonthPath={"endMonth" as Path<ContractFormValues>}
								/>
							</div>

							<div className="mt-5">
								<FixedEndSection />
							</div>
						</Card>
					)
					: null}

				<div
					className="aligned-form-grid aligned-form-grid--four aligned-form-date-grid"
					style={{ ...alignedLabelStyle, marginTop: 12, display: isCollocation ? "none" : undefined }}
				>
					<AlignedFormField label={t("contract.formLabel.startYear")} labelId="contract-form-label-start-year">
						<RHFSelect<ContractFormValues, "startYear", number | null>
							name="startYear"
							formItemProps={compactFormItemStyle}
							loading={isDateOptionsLoading}
							options={startYearOptions}
							selectProps={{
								"allowClear": true,
								"placeholder": t("contract.placeholder.selectYear"),
								"placement": "bottomRight",
								"dropdownAlign": { overflow: { adjustY: false } },
								"aria-labelledby": "contract-form-label-start-year",
							} as any}
						/>
					</AlignedFormField>

					<AlignedFormField label={t("contract.formLabel.startMonth")} labelId="contract-form-label-start-month">
						<RHFSelect<ContractFormValues, "startMonth", number | null>
							name="startMonth"
							formItemProps={compactFormItemStyle}
							loading={isDateOptionsLoading}
							options={startMonthOptions}
							selectProps={{
								"allowClear": true,
								"placeholder": t("contract.placeholder.selectMonth"),
								"placement": "bottomRight",
								"dropdownAlign": { overflow: { adjustY: false } },
								"aria-labelledby": "contract-form-label-start-month",
							} as any}
						/>
					</AlignedFormField>

					<AlignedFormField label={t("contract.formLabel.endYear")} labelId="contract-form-label-end-year">
						<RHFSelect<ContractFormValues, "endYear", number | null>
							name="endYear"
							formItemProps={compactFormItemStyle}
							loading={isDateOptionsLoading}
							options={endYearOptions}
							selectProps={{
								"allowClear": true,
								"placeholder": t("contract.placeholder.selectYear"),
								"placement": "bottomRight",
								"dropdownAlign": { overflow: { adjustY: false } },
								"aria-labelledby": "contract-form-label-end-year",
							} as any}
						/>
					</AlignedFormField>

					<AlignedFormField label={t("contract.formLabel.endMonth")} labelId="contract-form-label-end-month">
						<RHFSelect<ContractFormValues, "endMonth", number | null>
							name="endMonth"
							formItemProps={compactFormItemStyle}
							loading={isDateOptionsLoading}
							options={endMonthOptions}
							selectProps={{
								"allowClear": true,
								"placeholder": t("contract.placeholder.selectMonth"),
								"placement": "bottomRight",
								"dropdownAlign": { overflow: { adjustY: false } },
								"aria-labelledby": "contract-form-label-end-month",
							} as any}
						/>
					</AlignedFormField>
				</div>

				{isCollocation ? null : renderRealStartFields("main")}

				<div
					className="aligned-form-grid aligned-form-grid--two"
					style={{ ...alignedLabelStyle, marginTop: 12, display: isCollocation ? "none" : undefined }}
				>
					<div
						className="aligned-form-grid aligned-form-grid--two"
						style={{ ...alignedLabelStyle, marginTop: 12 }}
					>
						<AlignedFormField
							label={t("contract.list.column.contractNumber")}
							labelId="contract-form-label-contract-number"
						>
							<RHFProText<ContractFormValues, "contractNumber">
								name="contractNumber"
								formItemProps={compactFormItemStyle}
								transformValue={toPersianDigits}
								inputProps={{
									"maxLength": CONTRACT_NUMBER_MAX_LENGTH,
									"placeholder": t("contract.field.contractNumberExampleLegacy"),
									"aria-labelledby": "contract-form-label-contract-number",
								}}
							/>
						</AlignedFormField>
						<AlignedFormField label="" className="aligned-form-field--copy-button" labelId="contract-form-label-copy-contract-data">
							<ContractDataCopyButton />
						</AlignedFormField>
					</div>
				</div>

				{isSmsPartnersFlow
					? (
						<div className="contract-form-official-row">
							<RHFProCheckbox<ContractFormValues, any>
								name={"serviceFields.isOfficial" as any}
								label=""
								checkboxLabel={t("contract.field.officialContract")}
								checkboxProps={{}}
							/>
						</div>
					)
					: null}
			</BasicContent>
		</SectionCard>
	);
}
