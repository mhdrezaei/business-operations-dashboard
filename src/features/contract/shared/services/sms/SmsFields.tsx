import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types.js";
import type { ArrayPath, Path } from "react-hook-form";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { ContractTypeSection } from "#src/features/contract/components/contract-type/ContractTypeSection";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { ProCard, ProFormGroup } from "@ant-design/pro-components";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const sf = (path: string) => `serviceFields.${path}` as any;

export function SmsFields() {
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

	const counterpartyType = useWatch({ control, name: "counterpartyType" });

	const isGovOps = counterpartyType === "gov_ops";
	const isPartners = counterpartyType === "partners";

	return (
		<>

			<ProCard bordered headerBordered style={{ borderRadius: 6 }} title="درآمد اپراتورها" bodyStyle={{ padding: 16 }}>
				<div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
					<ContractTypeSection title="ایرانسل - فارسی" name={sf("operatorRevenue.irancellFa")} />
					<ContractTypeSection title="ایرانسل - انگلیسی" name={sf("operatorRevenue.irancellEn")} />
					<ContractTypeSection title="همراه اول - فارسی" name={sf("operatorRevenue.hamrahAvalFa")} />
					<ContractTypeSection title="سایر - فارسی" name={sf("operatorRevenue.otherFa")} />
					<ContractTypeSection title="سایر - انگلیسی" name={sf("operatorRevenue.otherEn")} />
				</div>
			</ProCard>
			{/* حالت شرکای تجاری */}
			{isPartners
				? (
					<>
						<ProCard bordered headerBordered style={{ borderRadius: 6 }} title="درآمد دولت" bodyStyle={{ padding: 16 }}>
							<ContractTypeSection title="درآمد دولت" name={sf("governmentRevenue")} />
						</ProCard>
						<ProCard bordered headerBordered style={{ borderRadius: 6, marginTop: 12 }} title="سود" bodyStyle={{ padding: 16 }}>
							<ContractTypeSection title="سود" name={sf("profit.pricing")} />
							<div style={{ marginTop: 12 }}>
								<ProFormGroup>
									<RHFProNumber
										name={sf("profit.minProfit")}
										label="حداقل سود (تومان)"
										inputProps={{ placeholder: "اختیاری" }}
										enableGrouping
										enableWordsTooltip
									/>
								</ProFormGroup>
							</div>
						</ProCard>
					</>
				)
				: null}

			{/* حالت دولت و اپراتورها */}
			{isGovOps
				? (
					<ProCard bordered headerBordered style={{ borderRadius: 6, marginTop: 12 }} title="نرخ دولت" bodyStyle={{ padding: 16 }}>
						<ContractTypeSection title="نرخ دولت" name={sf("governmentRate")} />
					</ProCard>
				)
				: null}
			{showAddenda
			// eslint-disable-next-line style/multiline-ternary
				? (
					<div style={{ marginTop: 12 }}>
						<ContractAddendaSection<ContractFormValues>
							title="الحاقیه‌های قرارداد (اختیاری)"
							name={sf("addenda") as ArrayPath<ContractFormValues>}
							contractTypeTitle=""
							contractTypeFieldKey="contractPricing"

							// ✅ مسیر تاریخ‌های قرارداد اصلی (root) - اجباری در Props شما
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
