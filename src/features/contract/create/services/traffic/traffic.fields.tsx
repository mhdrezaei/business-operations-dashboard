import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../model/contract.form.types";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { defaultContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types"; // همان default که قبلاً داری
import { ContractTypeSection } from "#src/features/contract/components/contract-type/ContractTypeSection";
import { DeleteOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Button, Row } from "antd";
import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const sf = (path: string) => `serviceFields.${path}` as const;

export function TrafficFields() {
	const { control, setValue } = useFormContext<ContractFormValues>();
	const tehranPricing = useWatch({ control, name: sf("tehranPricing") as any });
	const provincePricing = useWatch({ control, name: sf("provincePricing") as any });
	// تاریخ‌های اصلی قرارداد (root)
	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });

	const showAddenda = useMemo(
		() => startYear != null && startMonth != null && endYear != null && endMonth != null,
		[startYear, startMonth, endYear, endMonth],
	);

	const addTehran = () => {
		if (!tehranPricing)
			setValue(sf("tehranPricing") as any, structuredClone(defaultContractTypeValue), { shouldDirty: true, shouldValidate: true });
	};

	const addProvince = () => {
		if (!provincePricing)
			setValue(sf("provincePricing") as any, structuredClone(defaultContractTypeValue), { shouldDirty: true, shouldValidate: true });
	};

	const removeTehran = () => setValue(sf("tehranPricing") as any, undefined, { shouldDirty: true, shouldValidate: true });
	const removeProvince = () => setValue(sf("provincePricing") as any, undefined, { shouldDirty: true, shouldValidate: true });

	return (
		<>
			<ProCard bordered headerBordered style={{ borderRadius: 16, marginTop: 12 }} bodyStyle={{ padding: 16 }}>
				{/* <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
					<Button onClick={addProvince} disabled={!!provincePricing}>افزودن قرارداد مراکز استانی</Button>
					<Button onClick={addTehran} disabled={!!tehranPricing}>افزودن قرارداد تهران</Button>
				</div> */}
				<Row>

					<ProCard bordered headerBordered style={{ borderRadius: 16, marginTop: 12 }} bodyStyle={{ padding: 16 }}>
						<Row>
							<Button onClick={addTehran} disabled={!!tehranPricing}>افزودن قرارداد تهران</Button>
						</Row>
						{tehranPricing
							? (
								<Row>
									<ProCard
										bordered
										headerBordered
										style={{ width: "100%", borderRadius: 16, marginTop: 12 }}
										bodyStyle={{ padding: 16 }}
										title={<span style={{ fontWeight: 700 }}>قرارداد تهران</span>}
										extra={(
											<Button danger size="small" icon={<DeleteOutlined />} onClick={removeTehran}>
												حذف
											</Button>
										)}
									>
										<ContractTypeSection title="" name={sf("tehranPricing") as any} />
									</ProCard>
								</Row>
							)
							: null}
					</ProCard>
				</Row>
				<Row>
					<ProCard bordered headerBordered style={{ borderRadius: 16, marginTop: 12 }} bodyStyle={{ padding: 16 }}>
						<Row>

							<Button onClick={addProvince} disabled={!!provincePricing}>افزودن قرارداد مراکز استانی</Button>
						</Row>

						{provincePricing
							? (
								<Row>
									<ProCard
										bordered
										headerBordered
										style={{ borderRadius: 16, marginTop: 12 }}
										bodyStyle={{ padding: 16 }}
										title={<span style={{ fontWeight: 700 }}>قرارداد مراکز استانی</span>}
										extra={(

											<Button danger size="small" icon={<DeleteOutlined />} onClick={removeProvince}>حذف</Button>

										)}
									>
										<ContractTypeSection title="" name={sf("provincePricing") as any} />
									</ProCard>
								</Row>
							)
							: null}
					</ProCard>
				</Row>

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
