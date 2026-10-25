import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../../shared/model/contract.form.types";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { CONTRACT_TYPE_OPTIONS } from "#src/features/contract/components/contract-type/contract-type.options";
import { defaultContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types";
import { ContractTypeSection } from "#src/features/contract/components/contract-type/ContractTypeSection";
import { RHFProCheckbox, RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { getDefaultTrafficUnit, hasTrafficUnit } from "./traffic.units";
import "./traffic.fields.css";

const sf = (path: string) => `serviceFields.${path}` as const;
const TRAFFIC_SECTION_TONE = "traffic" as const;
const TRAFFIC_UNIT_OPTIONS = [
	{ label: "GB/month", value: "GB/month" },
	{ label: "Mbps", value: "Mbps" },
];
const IXP_CONTRACT_MODEL_OPTIONS = [
	{ labelKey: "contract.traffic.models.legacy", value: "LEGACY" },
	{ labelKey: "contract.traffic.models.variableTable", value: "VARIABLE_TABLE" },
];

interface TrafficPricingFieldsProps {
	pricingName: string
	unitName: string
	defaultUnit?: "GB/month" | "Mbps"
	revenuePercentName: string
	revenuePercentLabel: string
	showUnitSelector: boolean
	showPremiumRevenuePercent: boolean
	basedTireName: string
	showBasedTire: boolean
	contractModelName: string
	showContractModel: boolean
}

function TrafficPricingFields({
	pricingName,
	unitName,
	defaultUnit,
	revenuePercentName,
	revenuePercentLabel,
	showUnitSelector,
	showPremiumRevenuePercent,
	basedTireName,
	showBasedTire,
	contractModelName,
	showContractModel,
}: TrafficPricingFieldsProps) {
	const { t } = useTranslation();
	const { control, setValue } = useFormContext<ContractFormValues>();
	const unit = useWatch({ control, name: unitName as any });
	const contractModel = useWatch({ control, name: contractModelName as any });
	const basedTire = useWatch({ control, name: basedTireName as any });
	const contractType = useWatch({ control, name: `${pricingName}.type` as any });
	const fixedOnly = showBasedTire && basedTire === true;

	useEffect(() => {
		if (defaultUnit && (unit == null || unit === ""))
			setValue(unitName as any, defaultUnit, { shouldDirty: false, shouldValidate: false });
	}, [defaultUnit, setValue, unit, unitName]);

	useEffect(() => {
		if (fixedOnly && contractType !== "tier_fixed") {
			setValue(`${pricingName}.type` as any, "tier_fixed", { shouldDirty: true, shouldValidate: true });
		}
	}, [contractType, fixedOnly, pricingName, setValue]);
	const ratePercentageHelpText = contractModel === "VARIABLE_TABLE"
		? t("contract.traffic.rateHelpVariableTable")
		: t("contract.traffic.rateHelpLegacy");
	return (
		<div className="traffic-pricing-fields">
			{showUnitSelector || showPremiumRevenuePercent || showContractModel
				? (
					<div className="traffic-pricing-meta-fields">
						{showUnitSelector
							? (
								<RHFSelect
									name={unitName as any}
									label={t("contract.traffic.unit")}
									options={TRAFFIC_UNIT_OPTIONS}
									selectProps={{ placeholder: t("contract.traffic.selectUnit"), allowClear: false }}
								/>
							)
							: null}
						{showPremiumRevenuePercent
							? (
								<RHFProNumber
									name={revenuePercentName as any}
									label={revenuePercentLabel}
									inputProps={{ placeholder: t("contract.traffic.percentPlaceholder"), inputMode: "numeric" } as any}
									enableGrouping={false}
									enableWordsTooltip={false}
								/>
							)
							: null}
						{showBasedTire
							? (
								<RHFProCheckbox
									name={basedTireName as any}
									label=""
									checkboxLabel={t("contract.traffic.basedTire")}
								/>
							)
							: null}
						{showContractModel
							? (
								<RHFSelect
									name={contractModelName as any}
									label={t("contract.traffic.contractModel")}
									options={IXP_CONTRACT_MODEL_OPTIONS.map(option => ({ label: t(option.labelKey), value: option.value }))}
									selectProps={{ placeholder: t("contract.traffic.selectContractModel"), allowClear: false }}
								/>
							)
							: null}
					</div>
				)
				: null}

			<ContractTypeSection
				title=""
				name={pricingName}
				tone={TRAFFIC_SECTION_TONE}
				variant="embedded"
				contractTypeOptions={CONTRACT_TYPE_OPTIONS.map(option => ({
					...option,
					disabled: fixedOnly && option.value !== "tier_fixed",
				}))}
				showRatePercentage={showContractModel}
				ratePercentageHelpText={ratePercentageHelpText}
			/>
		</div>
	);
}

export function TrafficFields() {
	const { t } = useTranslation();
	const { control, getFieldState, getValues, setValue } = useFormContext<ContractFormValues>();
	const hasInitializedTehranPricing = useRef(false);
	const previousCompanyType = useRef<string | null>(null);
	const isOfficial = useWatch({ control, name: sf("isOfficial") as any }) as boolean | undefined;
	const companyType = useWatch({ control, name: "companyType" });
	const isCollocation = String(companyType ?? "").trim().toUpperCase() === "COLLOCATION";
	const isIxp = String(companyType ?? "").trim().toUpperCase() === "IXP";
	const tehranPricing = useWatch({ control, name: sf("tehranPricing") as any });
	const provincePricing = useWatch({ control, name: sf("provincePricing") as any });
	const tehranEnabled = useWatch({ control, name: sf("tehranEnabled") as any }) as boolean | undefined;
	const provinceEnabled = useWatch({ control, name: sf("provinceEnabled") as any }) as boolean | undefined;
	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });

	const showAddenda = useMemo(
		() => startYear != null && startMonth != null && endYear != null && endMonth != null,
		[startYear, startMonth, endYear, endMonth],
	);
	const showPricingUi = !!isOfficial;
	// در حالت غیررسمی فقط فعال بودن محل (و واحد) ثبت می‌شود؛ تهران پیش‌فرض فعال است (مثل old)
	const tehranOn = showPricingUi ? !!tehranPricing : tehranEnabled !== false;
	const provinceOn = showPricingUi ? !!provincePricing : provinceEnabled === true;
	const showPremiumRevenuePercent = showPricingUi && companyType === "PREMIUM";
	const showUnitSelector = showPricingUi && hasTrafficUnit(companyType);
	const normalizedCompanyType = String(companyType ?? "").trim().toUpperCase();
	const defaultTrafficUnit = getDefaultTrafficUnit(companyType);
	const addendaUnitPaths = (items: Array<Record<string, any>>, prefix: string): string[] => items.flatMap((item, index) => {
		const base = `${prefix}.${index}`;
		const paths = [`${base}.tehranUnit`, `${base}.provinceUnit`];
		if (Array.isArray(item.children))
			paths.push(...addendaUnitPaths(item.children, `${base}.children`));
		return paths;
	});

	useEffect(() => {
		const typeChangedByUser = previousCompanyType.current != null && previousCompanyType.current !== normalizedCompanyType && getFieldState("companyType").isDirty;
		previousCompanyType.current = normalizedCompanyType || null;
		if (!defaultTrafficUnit)
			return;

		const addenda = getValues(sf("addenda") as any) as Array<Record<string, any>> | undefined;
		const unitPaths = [sf("tehranUnit"), sf("provinceUnit")];
		if (Array.isArray(addenda))
			unitPaths.push(...addendaUnitPaths(addenda, sf("addenda")) as any);

		for (const unitField of unitPaths) {
			const currentUnit = getValues(unitField as any);
			if (currentUnit == null || currentUnit === "" || typeChangedByUser) {
				setValue(unitField as any, defaultTrafficUnit, {
					shouldDirty: false,
					shouldValidate: false,
				});
			}
		}
	}, [getFieldState, getValues, normalizedCompanyType, defaultTrafficUnit, setValue]);

	function addLocation(pricingPath: string, enabledPath: string, pricing: unknown) {
		if (!showPricingUi) {
			setValue(enabledPath as any, true, { shouldDirty: true, shouldValidate: true });
			return;
		}
		if (pricing)
			return;
		setValue(pricingPath as any, structuredClone(defaultContractTypeValue), {
			shouldDirty: true,
			shouldValidate: true,
		});
	}

	function removeLocation(pricingPath: string, enabledPath: string) {
		setValue((showPricingUi ? pricingPath : enabledPath) as any, showPricingUi ? undefined : false, { shouldDirty: true, shouldValidate: true });
	}

	useEffect(() => {
		if (!showPricingUi || isCollocation) {
			hasInitializedTehranPricing.current = false;
			return;
		}
		if (hasInitializedTehranPricing.current)
			return;

		if (!tehranPricing && getValues(sf("tehranEnabled") as any) !== false) {
			setValue(sf("tehranPricing") as any, structuredClone(defaultContractTypeValue), {
				shouldDirty: false,
				shouldValidate: false,
			});
		}
		if (!provincePricing && getValues(sf("provinceEnabled") as any) === true) {
			setValue(sf("provincePricing") as any, structuredClone(defaultContractTypeValue), {
				shouldDirty: false,
				shouldValidate: false,
			});
		}
		hasInitializedTehranPricing.current = true;
	}, [getValues, isCollocation, provincePricing, setValue, showPricingUi, tehranPricing]);

	useEffect(() => {
		if (!isIxp)
			return;

		if (getValues(sf("tehranBasedTire") as any) == null)
			setValue(sf("tehranBasedTire") as any, false, { shouldDirty: false, shouldValidate: false });
		if (getValues(sf("provinceBasedTire") as any) == null)
			setValue(sf("provinceBasedTire") as any, false, { shouldDirty: false, shouldValidate: false });
		if (getValues(sf("tehranContractModel") as any) == null)
			setValue(sf("tehranContractModel") as any, "LEGACY", { shouldDirty: false, shouldValidate: false });
		if (getValues(sf("provinceContractModel") as any) == null)
			setValue(sf("provinceContractModel") as any, "LEGACY", { shouldDirty: false, shouldValidate: false });
	}, [getValues, isIxp, setValue]);

	useEffect(() => {
		if (isOfficial !== false)
			return;

		const hasTehran = !!getValues(sf("tehranPricing") as any);
		const hasProvince = !!getValues(sf("provincePricing") as any);
		if (hasTehran || hasProvince) {
			setValue(sf("tehranEnabled") as any, hasTehran, { shouldDirty: false, shouldValidate: false });
			setValue(sf("provinceEnabled") as any, hasProvince, { shouldDirty: false, shouldValidate: false });
		}
		setValue(sf("tehranPricing") as any, undefined, { shouldDirty: true, shouldValidate: true });
		setValue(sf("provincePricing") as any, undefined, { shouldDirty: true, shouldValidate: true });
		setValue(sf("addenda") as any, undefined, { shouldDirty: true, shouldValidate: true });
		setValue(sf("tehranRevenuePercent") as any, undefined, { shouldDirty: true, shouldValidate: true });
		setValue(sf("provinceRevenuePercent") as any, undefined, { shouldDirty: true, shouldValidate: true });
		setValue(sf("tehranContractModel") as any, undefined, { shouldDirty: true, shouldValidate: true });
		setValue(sf("provinceContractModel") as any, undefined, { shouldDirty: true, shouldValidate: true });
	}, [isOfficial, getValues, setValue]);

	useEffect(() => {
		const addenda = getValues(sf("addenda") as any) as Array<Record<string, any>> | undefined;
		if (!Array.isArray(addenda) || addenda.length === 0)
			return;

		let changed = false;
		const syncLocations = (items: Array<Record<string, any>>): Array<Record<string, any>> => items.map((item) => {
			const next = { ...item };
			const legacyLocation = String(next.location ?? "").trim().toUpperCase();
			if (next.contractPricing && legacyLocation === "TEHRAN" && !next.tehranPricing) {
				next.tehranPricing = next.contractPricing;
				changed = true;
			}
			if (next.contractPricing && ["PROVINCE", "COUNTY"].includes(legacyLocation) && !next.provincePricing) {
				next.provincePricing = next.contractPricing;
				changed = true;
			}
			if ("location" in next || "contractPricing" in next) {
				delete next.location;
				delete next.contractPricing;
				changed = true;
			}

			if (!tehranPricing) {
				for (const key of ["tehranPricing", "tehranUnit", "tehranRevenuePercent", "tehranContractModel"]) {
					if (key in next) {
						delete next[key];
						changed = true;
					}
				}
			}
			if (!provincePricing) {
				for (const key of ["provincePricing", "provinceUnit", "provinceRevenuePercent", "provinceContractModel"]) {
					if (key in next) {
						delete next[key];
						changed = true;
					}
				}
			}

			if (Array.isArray(next.children))
				next.children = syncLocations(next.children);
			return next;
		});

		const nextAddenda = syncLocations(addenda);
		if (changed) {
			setValue(sf("addenda") as any, nextAddenda as any, {
				shouldDirty: true,
				shouldValidate: true,
			});
		}
	}, [tehranPricing, provincePricing, getValues, setValue]);

	if (isCollocation)
		return null;

	return (
		<>
			<SectionCard title={t("contract.traffic.pricingTitle")} tone={TRAFFIC_SECTION_TONE}>
				<div className="contract-form-official-row">
					<RHFProCheckbox<ContractFormValues, any>
						name={sf("isOfficial") as any}
						label=""
						checkboxLabel={t("contract.field.officialContract")}
						checkboxProps={{}}
					/>
				</div>

				{!isOfficial
					? <div className="traffic-non-official-notice">{t("contract.traffic.nonOfficialNotice")}</div>
					: null}

				<div className="traffic-pricing-list">
					<SectionCard
						title={t("contract.traffic.tehranContract")}
						tone={TRAFFIC_SECTION_TONE}
						extra={tehranOn
							? (
								<Button danger className="contract-dashed-action" icon={<DeleteOutlined />} onClick={() => removeLocation(sf("tehranPricing"), sf("tehranEnabled"))}>
									{t("common.delete")}
								</Button>
							)
							: null}
					>
						{tehranOn
							? showPricingUi
								? (
									<TrafficPricingFields
										pricingName={sf("tehranPricing")}
										unitName={sf("tehranUnit")}
										revenuePercentName={sf("tehranRevenuePercent")}
										revenuePercentLabel={t("contract.traffic.tehranRevenueShare")}
										showUnitSelector={showUnitSelector}
										showPremiumRevenuePercent={showPremiumRevenuePercent}
										basedTireName={sf("tehranBasedTire")}
										showBasedTire={isIxp}
										contractModelName={sf("tehranContractModel")}
										showContractModel={isIxp}
									/>
								)
								: <div className="traffic-non-official-notice">{t("contract.traffic.nonOfficialLocation")}</div>
							: (
								<Button className="contract-dashed-action" icon={<PlusOutlined />} onClick={() => addLocation(sf("tehranPricing"), sf("tehranEnabled"), tehranPricing)}>
									{t("contract.traffic.addTehran")}
								</Button>
							)}
					</SectionCard>

					<SectionCard
						title={t("contract.traffic.provinceContract")}
						tone={TRAFFIC_SECTION_TONE}
						extra={provinceOn
							? (
								<Button danger className="contract-dashed-action" icon={<DeleteOutlined />} onClick={() => removeLocation(sf("provincePricing"), sf("provinceEnabled"))}>
									{t("common.delete")}
								</Button>
							)
							: null}
					>
						{provinceOn
							? showPricingUi
								? (
									<TrafficPricingFields
										pricingName={sf("provincePricing")}
										unitName={sf("provinceUnit")}
										revenuePercentName={sf("provinceRevenuePercent")}
										revenuePercentLabel={t("contract.traffic.provinceRevenueShare")}
										showUnitSelector={showUnitSelector}
										showPremiumRevenuePercent={showPremiumRevenuePercent}
										basedTireName={sf("provinceBasedTire")}
										showBasedTire={isIxp}
										contractModelName={sf("provinceContractModel")}
										showContractModel={isIxp}
									/>
								)
								: <div className="traffic-non-official-notice">{t("contract.traffic.nonOfficialLocation")}</div>
							: (
								<Button className="contract-dashed-action" icon={<PlusOutlined />} onClick={() => addLocation(sf("provincePricing"), sf("provinceEnabled"), provincePricing)}>
									{t("contract.traffic.addProvince")}
								</Button>
							)}
					</SectionCard>
				</div>
			</SectionCard>

			{showPricingUi && showAddenda
				? (
					<ContractAddendaSection<ContractFormValues>
						title={t("contract.addenda.title")}
						name={sf("addenda") as ArrayPath<ContractFormValues>}
						contractTypeTitle=""
						contractTypeFieldKey="contractPricing"
						renderAddendumFields={base => (
							<div className="traffic-pricing-list">
								{tehranPricing
									? (
										<SectionCard title={t("contract.traffic.tehranContract")} tone={TRAFFIC_SECTION_TONE}>
											<TrafficPricingFields
												pricingName={`${base}.tehranPricing`}
												unitName={`${base}.tehranUnit`}
												defaultUnit={defaultTrafficUnit}
												revenuePercentName={`${base}.tehranRevenuePercent`}
												revenuePercentLabel={t("contract.traffic.tehranRevenueShare")}
												showUnitSelector={showUnitSelector}
												showPremiumRevenuePercent={showPremiumRevenuePercent}
												basedTireName={`${base}.tehranBasedTire`}
												showBasedTire={isIxp}
												contractModelName={`${base}.tehranContractModel`}
												showContractModel={isIxp}
											/>
										</SectionCard>
									)
									: null}

								{provincePricing
									? (
										<SectionCard title={t("contract.traffic.provinceContract")} tone={TRAFFIC_SECTION_TONE}>
											<TrafficPricingFields
												pricingName={`${base}.provincePricing`}
												unitName={`${base}.provinceUnit`}
												defaultUnit={defaultTrafficUnit}
												revenuePercentName={`${base}.provinceRevenuePercent`}
												revenuePercentLabel={t("contract.traffic.provinceRevenueShare")}
												showUnitSelector={showUnitSelector}
												showPremiumRevenuePercent={showPremiumRevenuePercent}
												basedTireName={`${base}.provinceBasedTire`}
												showBasedTire={isIxp}
												contractModelName={`${base}.provinceContractModel`}
												showContractModel={isIxp}
											/>
										</SectionCard>
									)
									: null}
							</div>
						)}
						contractStartYearPath={"startYear" as Path<ContractFormValues>}
						contractStartMonthPath={"startMonth" as Path<ContractFormValues>}
						contractEndYearPath={"endYear" as Path<ContractFormValues>}
						contractEndMonthPath={"endMonth" as Path<ContractFormValues>}
					/>
				)
				: null}
		</>
	);
}
