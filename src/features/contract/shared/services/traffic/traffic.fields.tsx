import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../../shared/model/contract.form.types";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { defaultContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types";
import { ContractTypeSection } from "#src/features/contract/components/contract-type/ContractTypeSection";
import { ContractFormSection } from "#src/features/contract/shared/ui/form/components/ContractFormSection";
import { RHFProCheckbox, RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import "./traffic.fields.css";

const sf = (path: string) => `serviceFields.${path}` as const;
const TRAFFIC_SECTION_TONE = "traffic" as const;
const TRAFFIC_UNIT_OPTIONS = [
	{ label: "GB/month", value: "GB/month" },
	{ label: "Mbps", value: "Mbps" },
];

interface TrafficPricingFieldsProps {
	pricingName: string
	unitName: string
	revenuePercentName: string
	revenuePercentLabel: string
	showUnitSelector: boolean
	showPremiumRevenuePercent: boolean
	basedTireName: string
	showBasedTire: boolean
}

function TrafficPricingFields({
	pricingName,
	unitName,
	revenuePercentName,
	revenuePercentLabel,
	showUnitSelector,
	showPremiumRevenuePercent,
	basedTireName,
	showBasedTire,
}: TrafficPricingFieldsProps) {
	return (
		<div className="traffic-pricing-fields">
			{showUnitSelector || showPremiumRevenuePercent
				? (
					<div className="traffic-pricing-meta-fields">
						{showUnitSelector
							? (
								<RHFSelect
									name={unitName as any}
									label="واحد"
									options={TRAFFIC_UNIT_OPTIONS}
									selectProps={{ placeholder: "انتخاب واحد", allowClear: false }}
								/>
							)
							: null}
						{showPremiumRevenuePercent
							? (
								<RHFProNumber
									name={revenuePercentName as any}
									label={revenuePercentLabel}
									inputProps={{ placeholder: "بین ۰ تا ۱۰۰", inputMode: "numeric" } as any}
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
									checkboxLabel="محاسبه پله بر اساس پله بالاتر انجام شود"
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
			/>
		</div>
	);
}

export function TrafficFields() {
	const { control, getValues, setValue } = useFormContext<ContractFormValues>();
	const hasInitializedTehranPricing = useRef(false);
	const isOfficial = useWatch({ control, name: sf("isOfficial") as any }) as boolean | undefined;
	const companyType = useWatch({ control, name: "companyType" });
	const isCollocation = String(companyType ?? "").trim().toUpperCase() === "COLLOCATION";
	const isIxp = String(companyType ?? "").trim().toUpperCase() === "IXP";
	const tehranPricing = useWatch({ control, name: sf("tehranPricing") as any });
	const provincePricing = useWatch({ control, name: sf("provincePricing") as any });
	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });

	const showAddenda = useMemo(
		() => startYear != null && startMonth != null && endYear != null && endMonth != null,
		[startYear, startMonth, endYear, endMonth],
	);
	const showPricingUi = !!isOfficial;
	const showPremiumRevenuePercent = showPricingUi && companyType === "PREMIUM";
	const showUnitSelector = showPricingUi && ["CP", "PREMIUM", "IXP", "TCI"].includes(String(companyType ?? "").trim().toUpperCase());

	function addTehran() {
		if (tehranPricing)
			return;
		setValue(sf("tehranPricing") as any, structuredClone(defaultContractTypeValue), {
			shouldDirty: true,
			shouldValidate: true,
		});
	}

	function addProvince() {
		if (provincePricing)
			return;
		setValue(sf("provincePricing") as any, structuredClone(defaultContractTypeValue), {
			shouldDirty: true,
			shouldValidate: true,
		});
	}

	function removeTehran() {
		setValue(sf("tehranPricing") as any, undefined, { shouldDirty: true, shouldValidate: true });
	}

	function removeProvince() {
		setValue(sf("provincePricing") as any, undefined, { shouldDirty: true, shouldValidate: true });
	}

	useEffect(() => {
		if (!showPricingUi || isCollocation) {
			hasInitializedTehranPricing.current = false;
			return;
		}
		if (hasInitializedTehranPricing.current)
			return;

		if (!tehranPricing) {
			setValue(sf("tehranPricing") as any, structuredClone(defaultContractTypeValue), {
				shouldDirty: false,
				shouldValidate: false,
			});
		}
		hasInitializedTehranPricing.current = true;
	}, [isCollocation, setValue, showPricingUi, tehranPricing]);

	useEffect(() => {
		if (!isIxp)
			return;

		if (getValues(sf("tehranBasedTire") as any) == null)
			setValue(sf("tehranBasedTire") as any, true, { shouldDirty: false, shouldValidate: false });
		if (getValues(sf("provinceBasedTire") as any) == null)
			setValue(sf("provinceBasedTire") as any, true, { shouldDirty: false, shouldValidate: false });
	}, [getValues, isIxp, setValue]);

	useEffect(() => {
		if (isOfficial !== false)
			return;

		setValue(sf("tehranPricing") as any, undefined, { shouldDirty: true, shouldValidate: true });
		setValue(sf("provincePricing") as any, undefined, { shouldDirty: true, shouldValidate: true });
		setValue(sf("addenda") as any, undefined, { shouldDirty: true, shouldValidate: true });
		setValue(sf("tehranRevenuePercent") as any, undefined, { shouldDirty: true, shouldValidate: true });
		setValue(sf("provinceRevenuePercent") as any, undefined, { shouldDirty: true, shouldValidate: true });
	}, [isOfficial, setValue]);

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
				for (const key of ["tehranPricing", "tehranUnit", "tehranRevenuePercent"]) {
					if (key in next) {
						delete next[key];
						changed = true;
					}
				}
			}
			if (!provincePricing) {
				for (const key of ["provincePricing", "provinceUnit", "provinceRevenuePercent"]) {
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
			<ContractFormSection title="بهای ترافیک" tone={TRAFFIC_SECTION_TONE}>
				<div className="contract-form-official-row">
					<RHFProCheckbox<ContractFormValues, any>
						name={sf("isOfficial") as any}
						label=""
						checkboxLabel="قرارداد رسمی است"
						checkboxProps={{}}
					/>
				</div>

				{!isOfficial
					? <div className="traffic-non-official-notice">قرارداد غیررسمی است؛ فیلدهای محاسباتی ارسال نمی‌شوند.</div>
					: null}

				{showPricingUi
					? (
						<div className="traffic-pricing-list">
							<ContractFormSection
								title="قرارداد ترافیک تهران"
								tone={TRAFFIC_SECTION_TONE}
								extra={tehranPricing
									? (
										<Button danger className="contract-dashed-action" icon={<DeleteOutlined />} onClick={removeTehran}>
											حذف
										</Button>
									)
									: null}
							>
								{tehranPricing
									? (
										<TrafficPricingFields
											pricingName={sf("tehranPricing")}
											unitName={sf("tehranUnit")}
											revenuePercentName={sf("tehranRevenuePercent")}
											revenuePercentLabel="درصد سهم درآمد (تهران)"
											showUnitSelector={showUnitSelector}
											showPremiumRevenuePercent={showPremiumRevenuePercent}
											basedTireName={sf("tehranBasedTire")}
											showBasedTire={isIxp}
										/>
									)
									: (
										<Button className="contract-dashed-action" icon={<PlusOutlined />} onClick={addTehran}>
											افزودن قرارداد تهران
										</Button>
									)}
							</ContractFormSection>

							<ContractFormSection
								title="قرارداد ترافیک مراکز استان‌ها"
								tone={TRAFFIC_SECTION_TONE}
								extra={provincePricing
									? (
										<Button danger className="contract-dashed-action" icon={<DeleteOutlined />} onClick={removeProvince}>
											حذف
										</Button>
									)
									: null}
							>
								{provincePricing
									? (
										<TrafficPricingFields
											pricingName={sf("provincePricing")}
											unitName={sf("provinceUnit")}
											revenuePercentName={sf("provinceRevenuePercent")}
											revenuePercentLabel="درصد سهم درآمد (مراکز استان‌ها)"
											showUnitSelector={showUnitSelector}
											showPremiumRevenuePercent={showPremiumRevenuePercent}
											basedTireName={sf("provinceBasedTire")}
											showBasedTire={isIxp}
										/>
									)
									: (
										<Button className="contract-dashed-action" icon={<PlusOutlined />} onClick={addProvince}>
											افزودن قرارداد مراکز استانی
										</Button>
									)}
							</ContractFormSection>
						</div>
					)
					: null}
			</ContractFormSection>

			{showPricingUi && showAddenda
				? (
					<ContractAddendaSection<ContractFormValues>
						title="الحاقیه‌های قرارداد (اختیاری)"
						name={sf("addenda") as ArrayPath<ContractFormValues>}
						contractTypeTitle=""
						contractTypeFieldKey="contractPricing"
						renderAddendumFields={base => (
							<div className="traffic-pricing-list">
								{tehranPricing
									? (
										<ContractFormSection title="قرارداد ترافیک تهران" tone={TRAFFIC_SECTION_TONE}>
											<TrafficPricingFields
												pricingName={`${base}.tehranPricing`}
												unitName={`${base}.tehranUnit`}
												revenuePercentName={`${base}.tehranRevenuePercent`}
												revenuePercentLabel="درصد سهم درآمد (تهران)"
												showUnitSelector={showUnitSelector}
												showPremiumRevenuePercent={showPremiumRevenuePercent}
												basedTireName={`${base}.tehranBasedTire`}
												showBasedTire={isIxp}
											/>
										</ContractFormSection>
									)
									: null}

								{provincePricing
									? (
										<ContractFormSection title="قرارداد ترافیک مراکز استان‌ها" tone={TRAFFIC_SECTION_TONE}>
											<TrafficPricingFields
												pricingName={`${base}.provincePricing`}
												unitName={`${base}.provinceUnit`}
												revenuePercentName={`${base}.provinceRevenuePercent`}
												revenuePercentLabel="درصد سهم درآمد (مراکز استان‌ها)"
												showUnitSelector={showUnitSelector}
												showPremiumRevenuePercent={showPremiumRevenuePercent}
												basedTireName={`${base}.provinceBasedTire`}
												showBasedTire={isIxp}
											/>
										</ContractFormSection>
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
