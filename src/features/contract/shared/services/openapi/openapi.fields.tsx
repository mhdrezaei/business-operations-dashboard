import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../../shared/model/contract.form.types";
import type { OpenApiContractModel } from "./openapi.types";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection.js";
import { ContractFormSection } from "#src/features/contract/shared/ui/form/components/ContractFormSection";
import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ContractTypeSection } from "../../../components/contract-type/ContractTypeSection";
import { defaultLegacyPricing, defaultSeparatedPricing } from "./openapi.types";

const sf = (path: string) => `serviceFields.${path}` as any;

function SeparatedPricingFields() {
	return (
		<div className="flex w-full flex-col">
			<ContractTypeSection
				title="استعلام قبض میان‌دوره"
				name={sf("separatedPricing.midPeriodBillInquiry")}
				tone="purple"
				topAside={(
					<RHFProNumber
						name={sf("separatedPricing.walletChargeDiscountPercent")}
						label="درصد تخفیف شارژ کیف‌پول"
						inputProps={{ addonAfter: "%", placeholder: "مثلاً 20" } as any}
					/>
				)}
			/>
			<ContractTypeSection title="استعلام قبض پایان‌دوره" name={sf("separatedPricing.endPeriodBillInquiry")} tone="purple" />
			<ContractTypeSection
				title="ثبت وصولی متصل"
				name={sf("separatedPricing.connectedReceiptRegister")}
				tone="purple"
				bottomAside={(
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<RHFProNumber name={sf("separatedPricing.connectedKarashabSharePercent")} label="درصد سهم کاراشاب" inputProps={{ addonAfter: "%", placeholder: "مثلاً 20" } as any} />
						<RHFProNumber name={sf("separatedPricing.connectedPartnerSharePercent")} label="درصد سهم طرف قرارداد" inputProps={{ addonAfter: "%", placeholder: "مثلاً 20" } as any} />
					</div>
				)}
			/>
			<ContractTypeSection
				title="ثبت وصولی غیرمتصل"
				name={sf("separatedPricing.disconnectedReceiptRegister")}
				tone="purple"
				bottomAside={(
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<RHFProNumber name={sf("separatedPricing.disconnectedKarashabSharePercent")} label="درصد سهم کاراشاب" inputProps={{ addonAfter: "%", placeholder: "مثلاً 20" } as any} />
						<RHFProNumber name={sf("separatedPricing.disconnectedPartnerSharePercent")} label="درصد سهم طرف قرارداد" inputProps={{ addonAfter: "%", placeholder: "مثلاً 20" } as any} />
					</div>
				)}
			/>
		</div>
	);
}

export function OpenApiFields() {
	const { control, setValue, getValues, register } = useFormContext<ContractFormValues>();
	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });
	const showAddenda = useMemo(
		() => startYear != null && startMonth != null && endYear != null && endMonth != null,
		[startYear, startMonth, endYear, endMonth],
	);
	const contractModel = useWatch({ control, name: sf("contractModel") }) as OpenApiContractModel | null;

	React.useEffect(() => {
		register(sf("contractModel"));
		if (!getValues(sf("contractModel"))) {
			setValue(sf("contractModel"), "legacy" as any, {
				shouldDirty: false,
				shouldTouch: false,
				shouldValidate: false,
			});
		}
	}, [register, setValue, getValues]);

	React.useEffect(() => {
		if (contractModel === "legacy") {
			if (!getValues(sf("legacyPricing"))) {
				setValue(sf("legacyPricing"), structuredClone(defaultLegacyPricing) as any, {
					shouldDirty: false,
					shouldValidate: false,
				});
			}
			setValue(sf("separatedPricing"), undefined as any, { shouldDirty: true, shouldValidate: true });
		}
		else if (contractModel === "separated") {
			setValue(sf("legacyPricing"), undefined as any, { shouldDirty: true, shouldValidate: true });
			if (!getValues(sf("separatedPricing"))) {
				setValue(sf("separatedPricing"), structuredClone(defaultSeparatedPricing) as any, {
					shouldDirty: false,
					shouldValidate: false,
				});
			}
		}
	}, [contractModel, setValue, getValues]);

	return (
		<div className="w-full">
			<ContractFormSection title="مدل قرارداد OpenAPI" tone="purple">
				<RHFSelect
					name={sf("contractModel")}
					label=""
					options={[
						{ label: "تفکیکی", value: "separated" },
						{ label: "قدیمی", value: "legacy" },
					]}
					selectProps={{ placeholder: "مدل قرارداد را انتخاب کنید", allowClear: false }}
				/>
			</ContractFormSection>

			{contractModel === "separated"
				? <SeparatedPricingFields />
				: (
					<div className="flex w-full flex-col">
						<ContractTypeSection
							title="بهای ثبت وصولی"
							name={sf("legacyPricing.paymentRegistration")}
							tone="purple"
							compactCalculationModel
							blendedModePlaceholder="انتخاب نوع پلکانی در این بخش"
						/>
						<ContractTypeSection
							title="بهای استعلام قبض"
							name={sf("legacyPricing.billInquiry")}
							tone="purple"
							compactCalculationModel
							blendedModePlaceholder="انتخاب نوع پلکانی در این بخش"
						/>
					</div>
				)}

			{showAddenda
				? (
					<div className="mt-3">
						<ContractAddendaSection<ContractFormValues>
							title="الحاقیه‌های قرارداد (اختیاری)"
							name={sf("addenda") as ArrayPath<ContractFormValues>}
							contractTypeTitle=""
							contractTypeFieldKey="contractPricing"
							canAddAddendum={!!contractModel}
							addendumAddBlockedMessage="ابتدا مدل قرارداد را انتخاب کنید."
							renderAddendumFields={base => (
								<div className="flex w-full flex-col">
									<ContractTypeSection
										title="بهای ثبت وصولی"
										name={`${base}.legacyPricing.paymentRegistration` as any}
										tone="purple"
										compactCalculationModel
										blendedModePlaceholder="انتخاب نوع پلکانی در این بخش"
									/>
									<ContractTypeSection
										title="بهای استعلام قبض"
										name={`${base}.legacyPricing.billInquiry` as any}
										tone="purple"
										compactCalculationModel
										blendedModePlaceholder="انتخاب نوع پلکانی در این بخش"
									/>
								</div>
							)}
							contractStartYearPath={"startYear" as Path<ContractFormValues>}
							contractStartMonthPath={"startMonth" as Path<ContractFormValues>}
							contractEndYearPath={"endYear" as Path<ContractFormValues>}
							contractEndMonthPath={"endMonth" as Path<ContractFormValues>}
						/>
					</div>
				)
				: null}
		</div>
	);
}
