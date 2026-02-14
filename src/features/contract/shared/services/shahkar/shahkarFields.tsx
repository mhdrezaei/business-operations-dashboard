import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../../shared/model/contract.form.types";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { ContractTypeSection } from "#src/features/contract/components/contract-type/ContractTypeSection";
import { ProCard } from "@ant-design/pro-components";

import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const sf = (path: string) => `serviceFields.${path}` as const;

export function ShahkarFields() {
	const { control } = useFormContext<ContractFormValues>();

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
			<ProCard
				bordered
				headerBordered
				style={{ borderRadius: 6 }}
				bodyStyle={{ padding: 16 }}
			>
				<ContractTypeSection
					title="بهای هر واحد"
					name={sf("contractPricing") as any}
				/>
			</ProCard>

			{showAddenda
				// eslint-disable-next-line style/multiline-ternary
				? (
					<div style={{ marginTop: 12 }}>
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
