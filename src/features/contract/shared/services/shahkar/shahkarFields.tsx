import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../../shared/model/contract.form.types";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { defaultContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types";
import { ContractTypeSection } from "#src/features/contract/components/contract-type/ContractTypeSection";
import { RHFProCheckbox } from "#src/shared/ui/rhf-pro";
import React, { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const sf = (path: string) => `serviceFields.${path}` as const;

export function ShahkarFields() {
	const { control, getValues, setValue } = useFormContext<ContractFormValues>();
	const hasNewCustomerRate = useWatch({ control, name: sf("hasNewCustomerRate") as any }) as boolean | undefined;

	useEffect(() => {
		if (hasNewCustomerRate) {
			if (getValues(sf("newCustomerPricing") as any) == null) {
				setValue(sf("newCustomerPricing") as any, structuredClone(defaultContractTypeValue), {
					shouldDirty: true,
					shouldValidate: false,
				});
			}
			return;
		}

		setValue(sf("newCustomerPricing") as any, undefined, {
			shouldDirty: true,
			shouldValidate: false,
		});
	}, [getValues, hasNewCustomerRate, setValue]);

	// تاریخ‌های اصلی قرارداد (root)
	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });

	const showAddenda = useMemo(
		() => startYear != null && startMonth != null && endYear != null && endMonth != null,
		[startYear, startMonth, endYear, endMonth],
	);

	return (
		<>
			<ContractTypeSection
				title="بهای هر واحد"
				name={sf("contractPricing") as any}
			/>

			<RHFProCheckbox<ContractFormValues, any>
				name={sf("hasNewCustomerRate") as any}
				checkboxLabel="این قرارداد نرخ مشتریان جدید دارد"
				itemProps={{ className: "mt-3 mb-0" }}
			/>

			{hasNewCustomerRate
				? (
					<ContractTypeSection
						title="نرخ مشتریان جدید"
						name={sf("newCustomerPricing") as any}
					/>
				)
				: null}

			{showAddenda
				// eslint-disable-next-line style/multiline-ternary
				? (
					<div className="mt-3">
						<ContractAddendaSection<ContractFormValues>
							title="الحاقیه‌های قرارداد (اختیاری)"
							name={sf("addenda") as ArrayPath<ContractFormValues>}
							contractTypeTitle=""
							contractTypeFieldKey="contractPricing"

							// ✅ Root contract dates path - mandatory in your Props
							contractStartYearPath={"startYear" as Path<ContractFormValues>}
							contractStartMonthPath={"startMonth" as Path<ContractFormValues>}
							contractEndYearPath={"endYear" as Path<ContractFormValues>}
							contractEndMonthPath={"endMonth" as Path<ContractFormValues>}
						/>
					</div>
				) : null}
		</>
	);
}
