import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types.js";
import type { ArrayPath, Path } from "react-hook-form";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { ContractTypeSection } from "#src/features/contract/components/contract-type/ContractTypeSection";
import { RHFProCheckbox, RHFProNumber } from "#src/shared/ui/rhf-pro";
import { Card } from "antd";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import "./sms.fields.css";

const sf = (path: string) => `serviceFields.${path}` as any;

function renderMinProfitField(name: string) {
	return (
		<RHFProNumber
			name={name as any}
			label="حداقل کارمزد"
			inputProps={{
				placeholder: "اختیاری",
				addonAfter: "تومان",
			}}
			enableGrouping
			enableWordsTooltip
		/>
	);
}

export function SmsFields() {
	const { control } = useFormContext<ContractFormValues>();

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
			<Card variant="outlined" className="rounded-md mb-3 [&_.ant-pro-card-body]:p-4">
				<RHFProCheckbox<ContractFormValues, any>
					name={sf("isOfficial") as any}
					label=""
					checkboxLabel="قرارداد رسمی است"
					checkboxProps={{}}
				/>
			</Card>

			<Card variant="outlined" className="rounded-md [&_.ant-pro-card-body]:p-4" title="سهم اپراتورها">
				<div className="sms-operator-grid">
					<ContractTypeSection title="ایرانسل - فارسی" name={sf("operatorRevenue.irancellFa")} />
					<ContractTypeSection title="ایرانسل - انگلیسی" name={sf("operatorRevenue.irancellEn")} />
					<ContractTypeSection title="همراه اول - فارسی" name={sf("operatorRevenue.hamrahAvalFa")} />
					<ContractTypeSection title="همراه اول - انگلیسی" name={sf("operatorRevenue.hamrahAvalEn")} />
					<ContractTypeSection title="سایر - فارسی" name={sf("operatorRevenue.otherFa")} />
					<ContractTypeSection title="سایر - انگلیسی" name={sf("operatorRevenue.otherEn")} />
				</div>
			</Card>

			{isPartners
				? (
					<>
						<Card variant="outlined" className="rounded-md [&_.ant-pro-card-body]:p-4" title="سهم دولت">
							<ContractTypeSection title="سهم دولت" name={sf("governmentRevenue")} />
						</Card>
						<div className="mt-3">
							<ContractTypeSection
								title="تعیین کارمزد و سهم"
								name={sf("profit.pricing")}
								topAside={renderMinProfitField(sf("profit.minProfit"))}
							/>
						</div>
					</>
				)
				: null}

			{isGovOps
				? (
					<Card variant="outlined" className="rounded-md mt-3 [&_.ant-pro-card-body]:p-4" title="سهم دولت">
						<ContractTypeSection title="سهم دولت" name={sf("governmentRate")} />
					</Card>
				)
				: null}

			{showAddenda
				? (
					<div className="mt-3">
						<ContractAddendaSection<ContractFormValues>
							title="الحاقیه‌های قرارداد (اختیاری)"
							name={sf("addenda") as ArrayPath<ContractFormValues>}
							contractTypeTitle=""
							contractTypeFieldKey="contractPricing"
							renderAddendumFields={base => (
								<>
									<Card variant="outlined" className="rounded-md [&_.ant-pro-card-body]:p-4" title="درآمد اپراتورها">
										<div className="sms-operator-grid">
											<ContractTypeSection title="ایرانسل - فارسی" name={`${base}.operatorRevenue.irancellFa` as any} />
											<ContractTypeSection title="ایرانسل - انگلیسی" name={`${base}.operatorRevenue.irancellEn` as any} />
											<ContractTypeSection title="همراه اول - فارسی" name={`${base}.operatorRevenue.hamrahAvalFa` as any} />
											<ContractTypeSection title="همراه اول - انگلیسی" name={`${base}.operatorRevenue.hamrahAvalEn` as any} />
											<ContractTypeSection title="سایر - فارسی" name={`${base}.operatorRevenue.otherFa` as any} />
											<ContractTypeSection title="سایر - انگلیسی" name={`${base}.operatorRevenue.otherEn` as any} />
										</div>
									</Card>

									{isPartners
										? (
											<>
												<Card variant="outlined" className="rounded-md mt-3 [&_.ant-pro-card-body]:p-4" title="سهم دولت">
													<ContractTypeSection title="سهم دولت" name={`${base}.governmentRevenue` as any} />
												</Card>
												<div className="mt-3">
													<ContractTypeSection
														title="تعیین کارمزد و سهم"
														name={`${base}.profit.pricing` as any}
														topAside={renderMinProfitField(`${base}.profit.minProfit`)}
													/>
												</div>
											</>
										)
										: null}

									{isGovOps
										? (
											<Card variant="outlined" className="rounded-md mt-3 [&_.ant-pro-card-body]:p-4" title="سهم دولت">
												<ContractTypeSection title="سهم دولت" name={`${base}.governmentRate` as any} />
											</Card>
										)
										: null}
								</>
							)}
							contractStartYearPath={"startYear" as Path<ContractFormValues>}
							contractStartMonthPath={"startMonth" as Path<ContractFormValues>}
							contractEndYearPath={"endYear" as Path<ContractFormValues>}
							contractEndMonthPath={"endMonth" as Path<ContractFormValues>}
						/>
					</div>
				)
				: null}
		</>
	);
}
