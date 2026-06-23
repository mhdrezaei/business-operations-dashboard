import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../../model/contract.form.types";
import { BasicContent } from "#src/components/";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { ContractTypeSection } from "#src/features/contract/components/contract-type/ContractTypeSection";
import { useAccess } from "#src/hooks";
import { RHFProNumber, RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Steps, Tooltip } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { companiesByServiceQuery, contractGapsQuery, servicesQuery, smsCommissionAgentsQuery, trafficDatacentersQuery } from "../../../queries/contract.queries";
import { companyTypeMatches } from "../../../utils";
import { ContractAlignedField, useContractAlignedLabelWidth } from "../components/ContractAlignedField";
import { MONTH_OPTIONS } from "../constants/jalali-date-options";
import { FixedEndSection } from "./FixedEndSection";

const COUNTERPARTY_OPTIONS = [
	{ label: "شرکای تجاری", value: "partners" },
	{ label: "قرارداد شرکت مخابرات ایران", value: "gov_ops" },
];

const COLLOCATION_COUNTERPARTY_OPTIONS = [
	{ label: "شرکای تجاری", description: "Business Partner", value: "partners" },
	{ label: "قرارداد شرکت مخابرات ایران", description: "Telecommunication Company of Iran", value: "gov_ops" },
] as const;

const COLLOCATION_COMPANY_TYPE_FALLBACK_OPTIONS = [
	{ label: "COLO", description: "Collocation", value: "COLLOCATION" },
	{ label: "CP", description: "Content Provider", value: "CP" },
] as const;

const COLLOCATION_ADDENDA_LOCATION_OPTIONS = [
	{ label: "تهران", value: "TEHRAN" },
	{ label: "مراکز استانی", value: "PROVINCE" },
];

const COLLOCATION_RACK_TYPE_OPTIONS = [
	{ label: "رک کامل", value: "full" },
	{ label: "نیم رک", value: "half" },
	{ label: "یک چهارم رک", value: "quarter" },
	{ label: "یونیت", value: "unit" },
];

const REAL_START_MIN_YEAR = 1400;
const REAL_START_TRIGGER_YEAR = 1404;
const REAL_START_TRIGGER_MONTH = 4;
const BEHESHTI_DATACENTER_TAG = "DEFAULT_BEHESHTI";

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

interface FixedStartSectionProps {
	mode?: "create" | "edit"
}

interface CollocationChoiceButtonProps {
	label: string
	description?: string
	selected: boolean
	onClick: () => void
}

interface CollocationStepPaneProps {
	active: boolean
	children: React.ReactNode
}

interface CollocationRackDiscountTierTableProps {
	name: string
	active: boolean
}

function CollocationStepPane({ active, children }: CollocationStepPaneProps) {
	return (
		<motion.div
			initial={false}
			animate={active
				? {
					opacity: 1,
					y: 0,
					height: "auto",
					visibility: "visible",
				}
				: {
					opacity: 0,
					y: 10,
					height: 0,
					transitionEnd: { visibility: "hidden" },
				}}
			transition={{ duration: 0.22, ease: "easeOut" }}
			style={{
				overflow: "hidden",
				pointerEvents: active ? "auto" : "none",
			}}
			aria-hidden={!active}
		>
			{children}
		</motion.div>
	);
}

function CollocationRackDiscountTierTable({ name, active }: CollocationRackDiscountTierTableProps) {
	const { control, setValue } = useFormContext<ContractFormValues>();
	const { fields, append, remove } = useFieldArray({ control, name: name as any });
	const rows = useWatch({ control, name: name as any }) as Array<{ from: number | null, to: number | null, discountPercent: number | null }> | undefined;

	useEffect(() => {
		if (!active || (rows && rows.length > 0))
			return;

		append({ from: null, to: null, discountPercent: null } as any);
	}, [active, rows, append]);

	useEffect(() => {
		if (!rows || rows.length < 2)
			return;

		for (let index = 1; index < rows.length; index++) {
			const previousTo = rows[index - 1]?.to ?? null;
			const currentFrom = rows[index]?.from ?? null;
			if (currentFrom !== previousTo) {
				setValue(`${name}.${index}.from` as any, previousTo as any, {
					shouldDirty: true,
					shouldValidate: true,
				});
			}
		}
	}, [rows, name, setValue]);

	function handleAddRow() {
		const previousTo = rows && rows.length > 0 ? rows[rows.length - 1]?.to ?? null : null;
		append({ from: previousTo, to: null, discountPercent: null } as any);
	}

	return (
		<div className="mt-5">
			<div className="mb-3 text-right text-base font-semibold">پلکان تخفیف رک (فقط برای دیتاسنتر بهشتی)</div>
			<Card variant="outlined" className="rounded-xl [&_.ant-pro-card-body]:p-3">
				<div className="overflow-hidden">
					<div className="grid grid-cols-[1fr_1fr_1fr_64px]">
						<div className="p-3 text-center font-semibold">بازه اول</div>
						<div className="p-3 text-center font-semibold">بازه دوم</div>
						<div className="p-3 text-center font-semibold">درصد تخفیف</div>
						<div />
					</div>

					{fields.map((field, index) => (
						<div
							key={field.id}
							className="grid grid-cols-[1fr_1fr_1fr_64px] border-t border-t-[rgba(255,255,255,0.08)]"
						>
							<div className="p-3">
								<RHFProNumber<ContractFormValues, any>
									name={`${name}.${index}.from` as any}
									label=""
									enableGrouping
									inputProps={{
										placeholder: "از",
										inputMode: "numeric",
										disabled: index > 0,
									} as any}
									formItemProps={{ className: "mb-0" }}
								/>
							</div>

							<div className="p-3">
								<RHFProNumber<ContractFormValues, any>
									name={`${name}.${index}.to` as any}
									label=""
									enableGrouping
									inputProps={{ placeholder: "تا", inputMode: "numeric" } as any}
									formItemProps={{ className: "mb-0" }}
								/>
							</div>

							<div className="p-3">
								<RHFProNumber<ContractFormValues, any>
									name={`${name}.${index}.discountPercent` as any}
									label=""
									inputProps={{ placeholder: "درصد", inputMode: "decimal" } as any}
									formItemProps={{ className: "mb-0" }}
								/>
							</div>

							<div className="flex items-center justify-center p-3">
								<Tooltip title="حذف ردیف">
									<Button
										type="text"
										danger
										icon={<DeleteOutlined />}
										onClick={() => remove(index)}
									/>
								</Tooltip>
							</div>
						</div>
					))}

					<div className="p-3">
						<Tooltip title="مقدار شروع بازه جدید به‌طور خودکار تنظیم می‌شود.">
							<Button icon={<PlusOutlined />} onClick={handleAddRow}>
								افزودن ردیف
							</Button>
						</Tooltip>
					</div>
				</div>
			</Card>
		</div>
	);
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

export function FixedStartSection({ mode = "create" }: FixedStartSectionProps) {
	const { setValue, control, trigger, formState, resetField, setFocus } = useFormContext<ContractFormValues>();
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
	const selectedAgentId = useWatch({ control, name: "serviceFields.agent" as any });
	const serviceIsOfficial = useWatch({ control, name: "serviceFields.isOfficial" as any }) as boolean | null | undefined;
	const collocationPartnerType = useWatch({ control, name: "serviceFields.collocationPartnerType" as any }) as string | null | undefined;
	const datacenters = useWatch({ control, name: "serviceFields.datacenters" as any }) as Array<Record<string, any>> | undefined;

	const permittedCreateServiceIdList = getPermittedServiceIds("contracts", permissionAction);
	const permittedCreateServiceIds = useMemo(
		() => new Set(permittedCreateServiceIdList),
		[permittedCreateServiceIdList.join(",")],
	);

	const companies = useQuery(companiesByServiceQuery(serviceId));
	const contractGaps = useQuery(contractGapsQuery({ serviceId, companyId, companyType }));

	const isSms = serviceCode === "sms";
	const isPsp = serviceCode === "psp";
	const isTraffic = serviceCode === "traffic";
	const isCollocation = isTraffic && String(companyType ?? "").trim().toUpperCase() === "COLLOCATION";
	const isTelecomCollocation = isCollocation && counterpartyType === "gov_ops";
	const requiresCompanyType = isSms || isPsp || isTraffic;
	const isSmsPartnersFlow = isSms && counterpartyType === "partners";
	const shouldSelectCompany = !isSms || isSmsPartnersFlow;
	const showCompanyTypeSelect = requiresCompanyType && shouldSelectCompany;
	const isSmsCommission = isSmsCommissionCode(serviceCode);
	const smsCommissionAgents = useQuery(smsCommissionAgentsQuery(isSmsCommission && !!companyId));
	const trafficDatacenters = useQuery(trafficDatacentersQuery(isCollocation));

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
			? getPermittedCompanyTypes("contracts", permissionAction, serviceId).map(item => ({ label: item.value, value: item.key }))
			: [],
		[requiresCompanyType, shouldSelectCompany, serviceId, permissionAction, getPermittedCompanyTypes],
	);
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
	const collocationCompanyOptions = useMemo(() => {
		const list = companies.data?.results ?? [];
		const targetType = collocationPartnerType || companyType;
		if (!targetType)
			return [];
		return list
			.filter((c: any) => companyTypeMatches(c.company_type, targetType))
			.map((c: any) => ({ label: c.name, value: c.id }));
	}, [companies.data, companyType, collocationPartnerType]);

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

	const trafficDatacenterOptions = useMemo(() => {
		const raw = trafficDatacenters.data;
		const list = Array.isArray(raw) ? raw : raw?.results ?? [];

		return list
			.map((item: any) => {
				const value = item?.id ?? item?.value ?? item?.code ?? item?.name;
				if (value == null)
					return null;

				return {
					label: String(item?.name ?? item?.title ?? item?.code ?? value),
					value: String(value),
					systemTag: typeof item?.system_tag === "string" ? item.system_tag : null,
				};
			})
			.filter((item): item is { label: string, value: string, systemTag: string | null } => Boolean(item));
	}, [trafficDatacenters.data]);
	const selectedDatacenterValues = useMemo(
		() => new Set((datacenters ?? []).map(item => String(item?.datacenter ?? "")).filter(Boolean)),
		[datacenters],
	);
	const availableTrafficDatacenterOptions = useMemo(
		() => trafficDatacenterOptions.filter(option => !selectedDatacenterValues.has(String(option.value))),
		[trafficDatacenterOptions, selectedDatacenterValues],
	);

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

	const showCompanySelect = shouldSelectCompany && (!requiresCompanyType || !!companyType) && !isCollocation;
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
		if (isCollocation) {
			labels.push("سال شروع واقعی قرارداد");
			labels.push("ماه شروع واقعی قرارداد");
		}
		return labels;
	}, [isSms, showCompanyTypeSelect, companyTypeLabel, showCompanySelect, isSmsCommission, isCollocation]);
	const alignedLabelStyle = useContractAlignedLabelWidth(visibleLabels);

	const companyOptions = requiresCompanyType ? companyOptionsByType : companyOptionsDefault;

	const isCompanyDisabled = !serviceId || companies.isLoading || (requiresCompanyType && shouldSelectCompany && !companyType);

	const companyPlaceholder
		= !serviceId
			? "ابتدا نوع سرویس را انتخاب کنید"
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
	const realStartYearOptions = useMemo(() => {
		const maxYear = startYear;
		if (maxYear == null || maxYear < REAL_START_MIN_YEAR)
			return [];

		return Array.from({ length: maxYear - REAL_START_MIN_YEAR + 1 }, (_, idx) => {
			const year = REAL_START_MIN_YEAR + idx;
			return { label: String(year), value: year };
		});
	}, [startYear]);
	const realStartMonthOptions = useMemo(() => [...MONTH_OPTIONS], []);
	const shouldShowRealStartFields = (
		isCollocation
		&& startYear === REAL_START_TRIGGER_YEAR
		&& startMonth === REAL_START_TRIGGER_MONTH
	);

	useEffect(() => {
		if (shouldShowRealStartFields)
			return;

		setValue("serviceFields.realStartYear" as any, null, { shouldDirty: false, shouldValidate: false });
		setValue("serviceFields.realStartMonth" as any, null, { shouldDirty: false, shouldValidate: false });
	}, [shouldShowRealStartFields, setValue]);

	const canQueryDateGaps = !!serviceId && !!companyId;
	const isDateOptionsLoading = canQueryDateGaps && (contractGaps.isLoading || contractGaps.isFetching);
	const compactFormItemStyle = { className: "mb-0" };
	const selectedCollocationPartner = collocationCompanyTypeOptions.find(option => option.value === collocationPartnerType);
	const selectedCollocationCompany = collocationCompanyOptions.find(option => option.value === companyId);
	const collocationSteps = isTelecomCollocation
		? [
			{ title: "انتخاب طرف قرارداد" },
			{ title: "اطلاعات قرارداد" },
		]
		: [
			{ title: "انتخاب طرف قرارداد" },
			{ title: "نوع شریک" },
			{ title: "انتخاب شرکت" },
			{ title: "دیتاسنترها" },
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

	function addDatacenter(value: string | null) {
		if (!value)
			return;
		const current = Array.isArray(datacenters) ? datacenters : [];
		if (current.some(item => String(item?.datacenter) === String(value)))
			return;
		const selectedOption = trafficDatacenterOptions.find(option => String(option.value) === String(value));
		const nextIndex = current.length;

		setValue("serviceFields.datacenters" as any, [
			...current,
			{
				rowKey: crypto.randomUUID(),
				datacenter: value,
				datacenterSystemTag: selectedOption?.systemTag ?? null,
				portItems: [{ rowKey: crypto.randomUUID(), count: null, speed: null, unitPrice: null }],
				rackItems: [{ rowKey: crypto.randomUUID(), rackType: null, count: null, unitPrice: null }],
			},
		], {
			shouldDirty: true,
			shouldValidate: false,
		});
		setValue("serviceFields.datacenter" as any, null, { shouldDirty: true, shouldValidate: false });
		window.setTimeout(() => {
			setFocus(`serviceFields.datacenters.${nextIndex}.bandwidthUnitRate` as any);
		}, 0);
	}

	function removeDatacenter(index: number) {
		const current = Array.isArray(datacenters) ? datacenters : [];
		setValue("serviceFields.datacenters" as any, current.filter((_, idx) => idx !== index), {
			shouldDirty: true,
			shouldValidate: true,
		});
	}

	function addDatacenterPortItem(datacenterIndex: number) {
		const current = Array.isArray(datacenters) ? [...datacenters] : [];
		const item = current[datacenterIndex] ?? {};
		const portItems = Array.isArray(item.portItems) ? item.portItems : [];
		current[datacenterIndex] = {
			...item,
			portItems: [...portItems, { rowKey: crypto.randomUUID(), count: null, speed: null, unitPrice: null }],
		};
		setValue("serviceFields.datacenters" as any, current, {
			shouldDirty: true,
			shouldValidate: false,
		});
	}

	function removeDatacenterPortItem(datacenterIndex: number, itemIndex: number) {
		const current = Array.isArray(datacenters) ? [...datacenters] : [];
		const item = current[datacenterIndex] ?? {};
		const portItems = Array.isArray(item.portItems) ? item.portItems : [];
		current[datacenterIndex] = {
			...item,
			portItems: portItems.filter((_, idx) => idx !== itemIndex),
		};
		setValue("serviceFields.datacenters" as any, current, {
			shouldDirty: true,
			shouldValidate: true,
		});
	}

	function addDatacenterRackItem(datacenterIndex: number) {
		const current = Array.isArray(datacenters) ? [...datacenters] : [];
		const item = current[datacenterIndex] ?? {};
		const rackItems = Array.isArray(item.rackItems) ? item.rackItems : [];
		current[datacenterIndex] = {
			...item,
			rackItems: [...rackItems, { rowKey: crypto.randomUUID(), rackType: null, count: null, unitPrice: null }],
		};
		setValue("serviceFields.datacenters" as any, current, {
			shouldDirty: true,
			shouldValidate: false,
		});
	}

	function removeDatacenterRackItem(datacenterIndex: number, itemIndex: number) {
		const current = Array.isArray(datacenters) ? [...datacenters] : [];
		const item = current[datacenterIndex] ?? {};
		const rackItems = Array.isArray(item.rackItems) ? item.rackItems : [];
		current[datacenterIndex] = {
			...item,
			rackItems: rackItems.filter((_, idx) => idx !== itemIndex),
		};
		setValue("serviceFields.datacenters" as any, current, {
			shouldDirty: true,
			shouldValidate: true,
		});
	}

	// if (false && isCollocation) {
	// 	return (
	// 		<Card className="w-full">
	// 			<BasicContent className="w-full">
	// 				<div className="contract-form-aligned-grid contract-form-aligned-grid--two" style={alignedLabelStyle}>
	// 					<ContractAlignedField label="نوع سرویس" labelId="contract-form-label-service">
	// 						<RHFSelect<ContractFormValues, "serviceId", number | null>
	// 							name="serviceId"
	// 							formItemProps={compactFormItemStyle}
	// 							loading={services.isLoading}
	// 							options={serviceOptions}
	// 							onValueChange={() => setCollocationStep(0)}
	// 							selectProps={{
	// 								"allowClear": true,
	// 								"placeholder": "سرویس را انتخاب کنید",
	// 								"aria-labelledby": "contract-form-label-service",
	// 							} as any}
	// 						/>
	// 					</ContractAlignedField>
	//
	// 					<ContractAlignedField label={companyTypeLabel} labelId="contract-form-label-company-type">
	// 						<RHFSelect<ContractFormValues, "companyType", any>
	// 							name="companyType"
	// 							formItemProps={compactFormItemStyle}
	// 							options={companyTypeOptions}
	// 							onValueChange={() => {
	// 								setCollocationStep(0);
	// 								setValue("serviceFields.collocationPartnerType" as any, null, {
	// 									shouldDirty: true,
	// 									shouldValidate: false,
	// 								});
	// 								setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
	// 							}}
	// 							selectProps={{
	// 								"allowClear": true,
	// 								"placeholder": "انتخاب کنید",
	// 								"aria-labelledby": "contract-form-label-company-type",
	// 							} as any}
	// 						/>
	// 					</ContractAlignedField>
	// 				</div>
	//
	// 				<Card
	// 					bordered
	// 					className="mt-4 rounded-2xl [&_.ant-pro-card-body]:p-5"
	// 				>
	// 					{/*<Steps*/}
	// 					{/*	current={activeCollocationStep}*/}
	// 					{/*	items={collocationSteps}*/}
	// 					{/*	responsive*/}
	// 					{/*	className="mb-8"*/}
	// 					{/*/>*/}
	//
	// 					{activeCollocationStep === 0
	// 						? (
	// 							<div className="grid gap-3 md:grid-cols-2">
	// 								{COLLOCATION_COUNTERPARTY_OPTIONS.map(option => (
	// 									<CollocationChoiceButton
	// 										key={option.value}
	// 										label={option.label}
	// 										description={option.description}
	// 										selected={counterpartyType === option.value}
	// 										onClick={() => {
	// 											setValue("counterpartyType", option.value, { shouldDirty: true, shouldValidate: true });
	// 											setValue("serviceFields.collocationPartnerType" as any, null, { shouldDirty: true, shouldValidate: false });
	// 											setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
	// 											setValue("serviceFields.datacenters" as any, [], { shouldDirty: true, shouldValidate: false });
	// 											setValue("serviceFields.datacenter" as any, null, { shouldDirty: true, shouldValidate: false });
	// 										}}
	// 									/>
	// 								))}
	// 							</div>
	// 						)
	// 						: null}
	//
	// 					{activeCollocationStep === 1
	// 						? (
	// 							<div className="grid gap-3 md:grid-cols-2">
	// 								{collocationCompanyTypeOptions.map(option => (
	// 									<CollocationChoiceButton
	// 										key={option.value}
	// 										label={option.label}
	// 										description={option.description}
	// 										selected={collocationPartnerType === option.value}
	// 										onClick={() => {
	// 											setValue("serviceFields.collocationPartnerType" as any, option.value, { shouldDirty: true, shouldValidate: true });
	// 											setValue("companyId", null, { shouldDirty: true, shouldValidate: false });
	// 										}}
	// 									/>
	// 								))}
	// 							</div>
	// 						)
	// 						: null}
	//
	// 					{activeCollocationStep === 2
	// 						? (
	// 							<div className="contract-form-aligned-grid contract-form-aligned-grid--two" style={alignedLabelStyle}>
	// 								<ContractAlignedField label="شرکت" labelId="contract-form-label-company">
	// 									<RHFSelect<ContractFormValues, "companyId", number | null>
	// 										name="companyId"
	// 										formItemProps={compactFormItemStyle}
	// 										loading={companies.isLoading}
	// 										options={collocationCompanyOptions as any}
	// 										selectProps={{
	// 											"allowClear": true,
	// 											"disabled": !collocationPartnerType || companies.isLoading,
	// 											"placeholder": !collocationPartnerType ? "ابتدا نوع شریک را انتخاب کنید" : companyPlaceholder,
	// 											"style": !collocationPartnerType || companies.isLoading ? { cursor: "not-allowed" } : undefined,
	// 											"open": !collocationPartnerType || companies.isLoading ? false : undefined,
	// 											"aria-labelledby": "contract-form-label-company",
	// 										}}
	// 									/>
	// 								</ContractAlignedField>
	// 							</div>
	// 						)
	// 						: null}
	//
	// 					{activeCollocationStep === 3
	// 						? (
	// 							<Card bordered className="rounded-xl">
	// 								<div className="text-sm text-[var(--ant-color-text-secondary)]">
	// 									دیتاسنترها پس از انتخاب شرکت قابل تکمیل هستند.
	// 								</div>
	// 							</Card>
	// 						)
	// 						: null}
	//
	// 					<div className="mt-4 flex items-center justify-between border-t border-[var(--ant-color-border)] pt-4">
	// 						{activeCollocationStep > 0
	// 							? (
	// 								<Button onClick={goToPreviousCollocationStep}>
	// 									قبلی
	// 								</Button>
	// 							)
	// 							: <span />}
	// 						{activeCollocationStep < collocationSteps.length - 1
	// 							? (
	// 								<Button
	// 									type="primary"
	// 									onClick={goToNextCollocationStep}
	// 									disabled={!canGoNextInCollocationStep}
	// 								>
	// 									بعدی
	// 								</Button>
	// 							)
	// 							: null}
	// 					</div>
	// 				</Card>
	//
	// 				{companyId != null
	// 					? (
	// 						<>
	// 							<div
	// 								className="contract-form-aligned-grid contract-form-aligned-grid--four contract-form-date-grid"
	// 								style={{ ...alignedLabelStyle, marginTop: 12 }}
	// 							>
	// 								<ContractAlignedField label="سال شروع" labelId="contract-form-label-start-year">
	// 									<RHFSelect<ContractFormValues, "startYear", number | null>
	// 										name="startYear"
	// 										formItemProps={compactFormItemStyle}
	// 										loading={isDateOptionsLoading}
	// 										options={startYearOptions}
	// 										selectProps={{
	// 											"allowClear": true,
	// 											"placeholder": "انتخاب سال",
	// 											"aria-labelledby": "contract-form-label-start-year",
	// 										} as any}
	// 									/>
	// 								</ContractAlignedField>
	//
	// 								<ContractAlignedField label="ماه شروع" labelId="contract-form-label-start-month">
	// 									<RHFSelect<ContractFormValues, "startMonth", number | null>
	// 										name="startMonth"
	// 										formItemProps={compactFormItemStyle}
	// 										loading={isDateOptionsLoading}
	// 										options={startMonthOptions}
	// 										selectProps={{
	// 											"allowClear": true,
	// 											"placeholder": "انتخاب ماه",
	// 											"aria-labelledby": "contract-form-label-start-month",
	// 										} as any}
	// 									/>
	// 								</ContractAlignedField>
	//
	// 								<ContractAlignedField label="سال پایان" labelId="contract-form-label-end-year">
	// 									<RHFSelect<ContractFormValues, "endYear", number | null>
	// 										name="endYear"
	// 										formItemProps={compactFormItemStyle}
	// 										loading={isDateOptionsLoading}
	// 										options={endYearOptions}
	// 										selectProps={{
	// 											"allowClear": true,
	// 											"placeholder": "انتخاب سال",
	// 											"aria-labelledby": "contract-form-label-end-year",
	// 										} as any}
	// 									/>
	// 								</ContractAlignedField>
	//
	// 								<ContractAlignedField label="ماه پایان" labelId="contract-form-label-end-month">
	// 									<RHFSelect<ContractFormValues, "endMonth", number | null>
	// 										name="endMonth"
	// 										formItemProps={compactFormItemStyle}
	// 										loading={isDateOptionsLoading}
	// 										options={endMonthOptions}
	// 										selectProps={{
	// 											"allowClear": true,
	// 											"placeholder": "انتخاب ماه",
	// 											"aria-labelledby": "contract-form-label-end-month",
	// 										} as any}
	// 									/>
	// 								</ContractAlignedField>
	// 							</div>
	//
	// 							<div
	// 								className="contract-form-aligned-grid contract-form-aligned-grid--two"
	// 								style={{ ...alignedLabelStyle, marginTop: 12 }}
	// 							>
	// 								<ContractAlignedField
	// 									label="شماره قرارداد"
	// 									labelId="contract-form-label-contract-number"
	// 								>
	// 									<RHFProText<ContractFormValues, "contractNumber">
	// 										name="contractNumber"
	// 										formItemProps={compactFormItemStyle}
	// 										inputProps={{
	// 											"placeholder": "مثلا CN-1404-001",
	// 											"aria-labelledby": "contract-form-label-contract-number",
	// 										}}
	// 									/>
	// 								</ContractAlignedField>
	// 							</div>
	// 						</>
	// 					)
	// 					: null}
	// 			</BasicContent>
	// 		</Card>
	// 	);
	// }

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
							onValueChange={() => setCollocationStep(0)}
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
											label={option.label}
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
								<div className="contract-form-aligned-grid contract-form-aligned-grid--two" style={alignedLabelStyle}>
									<ContractAlignedField label="شرکت" labelId="contract-form-label-company">
										<RHFSelect<ContractFormValues, "companyId", number | null>
											name="companyId"
											formItemProps={compactFormItemStyle}
											loading={companies.isLoading}
											options={collocationCompanyOptions as any}
											selectProps={{
												"allowClear": true,
												"disabled": !collocationPartnerType || companies.isLoading,
												"placeholder": !collocationPartnerType ? "ابتدا نوع شریک را انتخاب کنید" : companyPlaceholder,
												"style": !collocationPartnerType || companies.isLoading ? { cursor: "not-allowed" } : undefined,
												"open": !collocationPartnerType || companies.isLoading ? false : undefined,
												"aria-labelledby": "contract-form-label-company",
											}}
										/>
									</ContractAlignedField>
								</div>
							</CollocationStepPane>

							<CollocationStepPane active={isTelecomCollocation && activeCollocationStep === 1}>
								<div className="flex flex-col gap-5">
									<Card bordered className="rounded-xl">
										<div className="text-right text-sm font-semibold text-[var(--ant-color-text)]">
											قرارداد شرکت مخابرات ایران
										</div>
									</Card>

									<div>
										<div className="mb-3 text-right">
											<div className="text-base font-semibold">اطلاعات قرارداد</div>
											<div className="text-sm text-[var(--ant-color-text-secondary)]">شماره قرارداد و سایر مشخصات</div>
										</div>
										<div className="contract-form-aligned-grid contract-form-aligned-grid--two" style={alignedLabelStyle}>
											<ContractAlignedField
												label="شماره قرارداد"
												labelId="contract-form-label-contract-number-telecom"
											>
												<RHFProText<ContractFormValues, "contractNumber">
													name="contractNumber"
													formItemProps={compactFormItemStyle}
													inputProps={{
														"placeholder": "مثلا CN-1405-001",
														"aria-labelledby": "contract-form-label-contract-number-telecom",
													}}
												/>
											</ContractAlignedField>
										</div>
									</div>

									<div>
										<div className="mb-3 text-right">
											<div className="text-base font-semibold">بازه زمانی</div>
											<div className="text-sm text-[var(--ant-color-text-secondary)]">تاریخ شروع و پایان قرارداد</div>
										</div>
										<div
											className="contract-form-aligned-grid contract-form-aligned-grid--four contract-form-date-grid"
											style={alignedLabelStyle}
										>
											<ContractAlignedField label="سال شروع" labelId="contract-form-label-start-year-telecom">
												<RHFSelect<ContractFormValues, "startYear", number | null>
													name="startYear"
													formItemProps={compactFormItemStyle}
													loading={isDateOptionsLoading}
													options={startYearOptions}
													selectProps={{
														"allowClear": true,
														"placeholder": "سال",
														"aria-labelledby": "contract-form-label-start-year-telecom",
													} as any}
												/>
											</ContractAlignedField>

											<ContractAlignedField label="ماه شروع" labelId="contract-form-label-start-month-telecom">
												<RHFSelect<ContractFormValues, "startMonth", number | null>
													name="startMonth"
													formItemProps={compactFormItemStyle}
													loading={isDateOptionsLoading}
													options={startMonthOptions}
													selectProps={{
														"allowClear": true,
														"placeholder": "ماه",
														"aria-labelledby": "contract-form-label-start-month-telecom",
													} as any}
												/>
											</ContractAlignedField>

											<ContractAlignedField label="سال پایان" labelId="contract-form-label-end-year-telecom">
												<RHFSelect<ContractFormValues, "endYear", number | null>
													name="endYear"
													formItemProps={compactFormItemStyle}
													loading={isDateOptionsLoading}
													options={endYearOptions}
													selectProps={{
														"allowClear": true,
														"placeholder": "سال",
														"aria-labelledby": "contract-form-label-end-year-telecom",
													} as any}
												/>
											</ContractAlignedField>

											<ContractAlignedField label="ماه پایان" labelId="contract-form-label-end-month-telecom">
												<RHFSelect<ContractFormValues, "endMonth", number | null>
													name="endMonth"
													formItemProps={compactFormItemStyle}
													loading={isDateOptionsLoading}
													options={endMonthOptions}
													selectProps={{
														"allowClear": true,
														"placeholder": "ماه",
														"aria-labelledby": "contract-form-label-end-month-telecom",
													} as any}
												/>
											</ContractAlignedField>
										</div>
									</div>

									<div>
										<div className="mb-3 text-right">
											<div className="text-base font-semibold">جزئیات مالی</div>
											<div className="text-sm text-[var(--ant-color-text-secondary)]">هزینه رک‌ها و محاسبات کولوکیشن</div>
										</div>
										<div className="contract-form-aligned-grid contract-form-aligned-grid--two" style={alignedLabelStyle}>
											<RHFProNumber<ContractFormValues, any>
												name={"serviceFields.telecomRackCount" as any}
												label="تعداد رک"
												formItemProps={compactFormItemStyle}
												enableGrouping
											/>
											<RHFProNumber<ContractFormValues, any>
												name={"serviceFields.telecomUnitsPerRack" as any}
												label="تعداد یونیت هر رک"
												formItemProps={compactFormItemStyle}
												enableGrouping
											/>
											<RHFProNumber<ContractFormValues, any>
												name={"serviceFields.telecomMonthlyRackRent" as any}
												label="اجاره ماهیانه تمامی رک‌ها (ریال)"
												formItemProps={compactFormItemStyle}
												enableGrouping
												enableWordsTooltip
											/>
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
													نوع شریک:
													{" "}
													<b>{selectedCollocationPartner?.label ?? "-"}</b>
												</span>
												<span>
													نام شرکت:
													{" "}
													<b>{selectedCollocationCompany?.label ?? "-"}</b>
												</span>
											</div>
											<Button type="link" onClick={() => setCollocationStep(1)}>
												تغییر
											</Button>
										</div>
									</Card>

									<div>
										<div className="mb-3 text-right">
											<div className="text-base font-semibold">اطلاعات قرارداد</div>
											<div className="text-sm text-[var(--ant-color-text-secondary)]">شماره قرارداد و سایر مشخصات</div>
										</div>
										<div className="contract-form-aligned-grid contract-form-aligned-grid--two" style={alignedLabelStyle}>
											<ContractAlignedField
												label="شماره قرارداد"
												labelId="contract-form-label-contract-number"
											>
												<RHFProText<ContractFormValues, "contractNumber">
													name="contractNumber"
													formItemProps={compactFormItemStyle}
													inputProps={{
														"placeholder": "مثلا CN-1405-001",
														"aria-labelledby": "contract-form-label-contract-number",
													}}
												/>
											</ContractAlignedField>
										</div>
									</div>

									<div>
										<div className="mb-3 text-right">
											<div className="text-base font-semibold">بازه زمانی</div>
											<div className="text-sm text-[var(--ant-color-text-secondary)]">تاریخ شروع و پایان قرارداد</div>
										</div>
										<div
											className="contract-form-aligned-grid contract-form-aligned-grid--four contract-form-date-grid"
											style={alignedLabelStyle}
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
										<CollocationStepPane active={shouldShowRealStartFields}>
											<div className="mt-4 contract-form-aligned-grid contract-form-aligned-grid--two contract-form-date-grid" style={alignedLabelStyle}>
												<ContractAlignedField label="سال شروع واقعی قرارداد" labelId="contract-form-label-real-start-year">
													<RHFSelect<ContractFormValues, any, number | null>
														name={"serviceFields.realStartYear" as any}
														formItemProps={compactFormItemStyle}
														options={realStartYearOptions}
														selectProps={{
															"allowClear": true,
															"placeholder": "سال",
															"aria-labelledby": "contract-form-label-real-start-year",
														} as any}
													/>
												</ContractAlignedField>

												<ContractAlignedField label="ماه شروع واقعی قرارداد" labelId="contract-form-label-real-start-month">
													<RHFSelect<ContractFormValues, any, number | null>
														name={"serviceFields.realStartMonth" as any}
														formItemProps={compactFormItemStyle}
														options={realStartMonthOptions}
														selectProps={{
															"allowClear": true,
															"placeholder": "ماه",
															"aria-labelledby": "contract-form-label-real-start-month",
														} as any}
													/>
												</ContractAlignedField>
											</div>
										</CollocationStepPane>
									</div>

									<div>
										<div className="mb-3 text-right">
											<div className="text-base font-semibold">جزئیات مالی</div>
											<div className="text-sm text-[var(--ant-color-text-secondary)]">اطلاعات دیتاسنترها و نرخ‌های کولوکیشن</div>
										</div>
										<Card bordered className="rounded-xl">
											<div className="mb-3 text-right text-base font-semibold">دیتاسنترهای قرارداد</div>
											<div className="flex flex-col gap-5">
												<AnimatePresence initial={false}>
													{(datacenters ?? []).map((datacenterItem, datacenterIndex) => {
														const datacenterValue = String(datacenterItem?.datacenter ?? "");
														const selectedDatacenterOption = trafficDatacenterOptions.find(option => option.value === datacenterValue);
														const datacenterLabel = selectedDatacenterOption?.label ?? "دیتاسنتر انتخاب‌شده";
														const shouldShowRackDiscountTiers = collocationPartnerType === "CP" && selectedDatacenterOption?.systemTag === BEHESHTI_DATACENTER_TAG;
														const portItems = Array.isArray(datacenterItem?.portItems) && datacenterItem.portItems.length > 0
															? datacenterItem.portItems
															: [{ rowKey: "initial-port", count: null, speed: null, unitPrice: null }];
														const rackItems = Array.isArray(datacenterItem?.rackItems) && datacenterItem.rackItems.length > 0
															? datacenterItem.rackItems
															: [{ rowKey: "initial-rack", rackType: null, count: null, unitPrice: null }];

														return (
															<motion.div
																key={String(datacenterItem?.rowKey ?? datacenterValue)}
																initial={{ opacity: 0, y: 12, scale: 0.99 }}
																animate={{ opacity: 1, y: 0, scale: 1 }}
																exit={{ opacity: 0, y: -8, scale: 0.99 }}
																transition={{ duration: 0.24, ease: "easeOut" }}
															>
																<Card bordered className="rounded-xl">
																	<div className="mb-4 flex items-center justify-between gap-3">
																		<div className="text-right">
																			<div className="text-base font-semibold">
																				{datacenterLabel}
																			</div>
																			<div className="text-sm text-[var(--ant-color-text-secondary)]">بستن جزئیات</div>
																		</div>
																		<Button
																			danger
																			onClick={() => removeDatacenter(datacenterIndex)}
																		>
																			حذف
																		</Button>
																	</div>

																	<div className="grid gap-4 md:grid-cols-2">
																		<RHFProNumber<ContractFormValues, any>
																			name={`serviceFields.datacenters.${datacenterIndex}.bandwidthUnitRate` as any}
																			label="نرخ هر واحد پهنای باند (ریال)"
																			formItemProps={compactFormItemStyle}
																			enableGrouping
																			enableWordsTooltip
																		/>
																		<RHFProNumber<ContractFormValues, any>
																			name={`serviceFields.datacenters.${datacenterIndex}.ipRate` as any}
																			label="نرخ هر IP (ریال)"
																			formItemProps={compactFormItemStyle}
																			enableGrouping
																			enableWordsTooltip
																		/>
																	</div>

																	<div className="mt-5">
																		<div className="mb-3 text-right text-base font-semibold">آیتم‌های پورت</div>
																		<div className="flex flex-col gap-3">
																			{portItems.map((item: any, idx: number) => (
																				<Card key={String(item?.rowKey ?? `port-${item?.count ?? "empty"}-${item?.speed ?? "empty"}-${item?.unitPrice ?? "empty"}`)} bordered className="rounded-xl">
																					<div className="mb-3 flex items-center justify-between gap-3">
																						<div className="text-right">
																							آیتم
																							{" "}
																							{idx + 1}
																						</div>
																						<Button danger onClick={() => removeDatacenterPortItem(datacenterIndex, idx)}>
																							حذف
																						</Button>
																					</div>
																					<div className="grid gap-4 md:grid-cols-3">
																						<RHFProNumber<ContractFormValues, any>
																							name={`serviceFields.datacenters.${datacenterIndex}.portItems.${idx}.unitPrice` as any}
																							label="قیمت هر واحد (ریال)"
																							formItemProps={compactFormItemStyle}
																							enableGrouping
																							enableWordsTooltip
																						/>
																						<RHFProNumber<ContractFormValues, any>
																							name={`serviceFields.datacenters.${datacenterIndex}.portItems.${idx}.speed` as any}
																							label="سرعت"
																							formItemProps={compactFormItemStyle}
																							enableGrouping
																						/>
																						<RHFProNumber<ContractFormValues, any>
																							name={`serviceFields.datacenters.${datacenterIndex}.portItems.${idx}.count` as any}
																							label="تعداد"
																							formItemProps={compactFormItemStyle}
																							enableGrouping
																						/>
																					</div>
																				</Card>
																			))}
																		</div>
																		<div className="mt-3 flex justify-end">
																			<Button onClick={() => addDatacenterPortItem(datacenterIndex)}>افزودن آیتم</Button>
																		</div>
																	</div>

																	<div className="mt-5">
																		<div className="mb-3 text-right text-base font-semibold">آیتم‌های رک</div>
																		<div className="flex flex-col gap-3">
																			{rackItems.map((item: any, idx: number) => (
																				<Card key={String(item?.rowKey ?? `rack-${item?.rackType ?? "empty"}-${item?.count ?? "empty"}-${item?.unitPrice ?? "empty"}`)} bordered className="rounded-xl">
																					<div className="mb-3 flex items-center justify-between gap-3">
																						<div className="text-right">
																							آیتم
																							{" "}
																							{idx + 1}
																						</div>
																						<Button danger onClick={() => removeDatacenterRackItem(datacenterIndex, idx)}>
																							حذف
																						</Button>
																					</div>
																					<div className="grid gap-4 md:grid-cols-3">
																						<RHFProNumber<ContractFormValues, any>
																							name={`serviceFields.datacenters.${datacenterIndex}.rackItems.${idx}.unitPrice` as any}
																							label="قیمت هر واحد (ریال)"
																							formItemProps={compactFormItemStyle}
																							enableGrouping
																							enableWordsTooltip
																						/>
																						<RHFProNumber<ContractFormValues, any>
																							name={`serviceFields.datacenters.${datacenterIndex}.rackItems.${idx}.count` as any}
																							label="تعداد"
																							formItemProps={compactFormItemStyle}
																							enableGrouping
																						/>
																						<RHFSelect<ContractFormValues, any, string | null>
																							name={`serviceFields.datacenters.${datacenterIndex}.rackItems.${idx}.rackType` as any}
																							label="نوع رک"
																							formItemProps={compactFormItemStyle}
																							options={COLLOCATION_RACK_TYPE_OPTIONS}
																							selectProps={{ allowClear: true, placeholder: "انتخاب کنید" }}
																						/>
																					</div>
																				</Card>
																			))}
																		</div>
																		<div className="mt-3 flex justify-end">
																			<Button onClick={() => addDatacenterRackItem(datacenterIndex)}>افزودن آیتم</Button>
																		</div>
																	</div>

																	<div className="mt-5 grid gap-4 md:grid-cols-2">
																		<RHFProNumber<ContractFormValues, any>
																			name={`serviceFields.datacenters.${datacenterIndex}.electricityAmpRate` as any}
																			label="نرخ هر آمپر (ریال)"
																			formItemProps={compactFormItemStyle}
																			enableGrouping
																			enableWordsTooltip
																		/>
																		<RHFProNumber<ContractFormValues, any>
																			name={`serviceFields.datacenters.${datacenterIndex}.electricityExemptionThreshold` as any}
																			label="آستانه معافیت آمپر"
																			formItemProps={compactFormItemStyle}
																			enableGrouping
																		/>
																	</div>

																	<CollocationStepPane active={shouldShowRackDiscountTiers}>
																		<CollocationRackDiscountTierTable
																			name={`serviceFields.datacenters.${datacenterIndex}.rackDiscountTiers`}
																			active={shouldShowRackDiscountTiers}
																		/>
																	</CollocationStepPane>
																</Card>
															</motion.div>
														);
													})}
												</AnimatePresence>

												<ContractAlignedField label="انتخاب دیتاسنتر" labelId="contract-form-label-datacenter">
													<RHFSelect<ContractFormValues, any, string | null>
														name={"serviceFields.datacenter" as any}
														formItemProps={compactFormItemStyle}
														loading={trafficDatacenters.isLoading || trafficDatacenters.isFetching}
														options={availableTrafficDatacenterOptions}
														onValueChange={value => addDatacenter(value)}
														selectProps={{
															"allowClear": true,
															"placeholder": trafficDatacenters.isLoading || trafficDatacenters.isFetching
																? "در حال دریافت دیتاسنترها..."
																: availableTrafficDatacenterOptions.length > 0
																	? "دیتاسنتر را انتخاب کنید"
																	: "دیتاسنتری برای انتخاب باقی نمانده",
															"disabled": trafficDatacenters.isLoading || trafficDatacenters.isFetching || availableTrafficDatacenterOptions.length === 0,
															"aria-labelledby": "contract-form-label-datacenter",
														} as any}
													/>
												</ContractAlignedField>
											</div>
										</Card>
									</div>
								</div>
							</CollocationStepPane>

							<div className="mt-4 flex items-center justify-between border-t border-[var(--ant-color-border)] pt-4">
								{activeCollocationStep > 0
									? (
										<Button onClick={goToPreviousCollocationStep}>
											قبلی
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
											بعدی
										</Button>
									)
									: null}
							</div>

							<div className="mt-5 border-t border-[var(--ant-color-border)] pt-5">
								<ContractAddendaSection<ContractFormValues>
									title="الحاقیه‌های قرارداد (اختیاری)"
									name={"serviceFields.addenda" as ArrayPath<ContractFormValues>}
									contractTypeTitle=""
									contractTypeFieldKey="contractPricing"
									renderAddendumFields={base => (
										<>
											<RHFSelect
												name={`${base}.location` as any}
												label="موقعیت"
												options={COLLOCATION_ADDENDA_LOCATION_OPTIONS}
												selectProps={{ placeholder: "انتخاب نوع محاسبه", allowClear: true }}
											/>
											<ContractTypeSection
												title="روش محاسبه قیمت"
												name={`${base}.contractPricing` as any}
											/>
										</>
									)}
									contractStartYearPath={"startYear" as Path<ContractFormValues>}
									contractStartMonthPath={"startMonth" as Path<ContractFormValues>}
									contractEndYearPath={"endYear" as Path<ContractFormValues>}
									contractEndMonthPath={"endMonth" as Path<ContractFormValues>}
								/>
							</div>

							<div className="mt-5">
								<FixedEndSection showSignedCheckbox />
							</div>
						</Card>
					)
					: null}

				<div
					className="contract-form-aligned-grid contract-form-aligned-grid--four contract-form-date-grid"
					style={{ ...alignedLabelStyle, marginTop: 12, display: isCollocation ? "none" : undefined }}
				>
					<ContractAlignedField label="سال شروع" labelId="contract-form-label-start-year">
						<RHFSelect<ContractFormValues, "startYear", number | null>
							name="startYear"
							formItemProps={compactFormItemStyle}
							loading={isDateOptionsLoading}
							options={startYearOptions}
							selectProps={{
								"allowClear": true,
								"placeholder": "انتخاب سال",
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
								"placeholder": "انتخاب ماه",
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
								"placeholder": "انتخاب سال",
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
								"placeholder": "انتخاب ماه",
								"aria-labelledby": "contract-form-label-end-month",
							} as any}
						/>
					</ContractAlignedField>
				</div>

				<div
					className="contract-form-aligned-grid contract-form-aligned-grid--two"
					style={{ ...alignedLabelStyle, marginTop: 12, display: isCollocation ? "none" : undefined }}
				>
					<div
						className="contract-form-aligned-grid contract-form-aligned-grid--two"
						style={{ ...alignedLabelStyle, marginTop: 12 }}
					>
						<ContractAlignedField
							label="شماره قرارداد"
							labelId="contract-form-label-contract-number"
						>
							<RHFProText<ContractFormValues, "contractNumber">
								name="contractNumber"
								formItemProps={compactFormItemStyle}
								inputProps={{
									"placeholder": "مثلا CN-1404-001",
									"aria-labelledby": "contract-form-label-contract-number",
								}}
							/>
						</ContractAlignedField>
					</div>
				</div>
			</BasicContent>
		</Card>
	);
}
