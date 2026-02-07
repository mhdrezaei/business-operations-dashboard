import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../model/contract.form.types";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { defaultContractTypeValue } from "#src/features/contract/components/contract-type/contract-type.types";
import { ContractTypeSection } from "#src/features/contract/components/contract-type/ContractTypeSection";
import { RHFProCheckbox, RHFProNumber } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Button, Row } from "antd";
import React, { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const sf = (path: string) => `serviceFields.${path}` as const;

export function TrafficFields() {
	const { control, setValue } = useFormContext<ContractFormValues>();

	const isOfficial = useWatch({ control, name: sf("isOfficial") as any }) as boolean | undefined;

	const trafficCompanyType = useWatch({ control, name: "trafficCompanyType" });

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

	// Show the computational UI only when it is official.
	const showPricingUi = !!isOfficial;

	// Show revenue percentage only when it is official + PREMIUM
	const showPremiumRevenuePercent = showPricingUi && trafficCompanyType === "PREMIUM";

	const addTehran = () => {
		if (!tehranPricing) {
			setValue(sf("tehranPricing") as any, structuredClone(defaultContractTypeValue), {
				shouldDirty: true,
				shouldValidate: true,
			});
		}
	};

	const addProvince = () => {
		if (!provincePricing) {
			setValue(sf("provincePricing") as any, structuredClone(defaultContractTypeValue), {
				shouldDirty: true,
				shouldValidate: true,
			});
		}
	};

	const removeTehran = () =>
		setValue(sf("tehranPricing") as any, undefined, { shouldDirty: true, shouldValidate: true });

	const removeProvince = () =>
		setValue(sf("provincePricing") as any, undefined, { shouldDirty: true, shouldValidate: true });

	// ✅ When it becomes unofficial: Clear all calculation fields to keep both UI and payload clean
	React.useEffect(() => {
		if (!isOfficial) {
			setValue(sf("tehranPricing") as any, undefined, { shouldDirty: true, shouldValidate: true });
			setValue(sf("provincePricing") as any, undefined, { shouldDirty: true, shouldValidate: true });
			setValue(sf("addenda") as any, undefined, { shouldDirty: true, shouldValidate: true });
			setValue(sf("tehranRevenuePercent") as any, undefined, { shouldDirty: true, shouldValidate: true });
			setValue(sf("provinceRevenuePercent") as any, undefined, { shouldDirty: true, shouldValidate: true });
		}
	}, [isOfficial, setValue]);

	return (
		<>
			<ProCard bordered headerBordered style={{ borderRadius: 6 }} bodyStyle={{ padding: 16 }}>
				{/* ✅ Formal/Informal Field */}
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>

					<RHFProCheckbox<ContractFormValues, any>
						name={sf("isOfficial") as any}
						label=""
						checkboxLabel="قرارداد رسمی است"
						checkboxProps={{}}
					/>
				</div>
				{!isOfficial
					? (
						<div style={{ marginBottom: 12, color: "#faad14" }}>
							قرارداد غیررسمی است؛ فیلدهای محاسباتی ارسال نمی‌شوند.
						</div>
					)
					: (
						<div style={{ marginBottom: 12, opacity: 0.9 }}>
							توجه: هر واحد قیمت برابر با یک مگابیت بر ثانیه است.
						</div>
					)}

				{/* ✅ Only when official: Show calculated fields */}
				{showPricingUi
					? (
						<>

							<Row>
								<ProCard bordered headerBordered style={{ borderRadius: 6, marginTop: 12 }} bodyStyle={{ padding: 16 }}>
									<Row>
										<Button onClick={addTehran} disabled={!!tehranPricing}>افزودن قرارداد تهران</Button>
									</Row>

									{tehranPricing
										? (
											<Row>
												<ProCard
													bordered
													headerBordered
													style={{ width: "100%", borderRadius: 6, marginTop: 12 }}
													bodyStyle={{ padding: 16 }}
													title={<span style={{ fontWeight: 700 }}>قرارداد تهران</span>}
													extra={(
														<Button danger size="small" icon={<DeleteOutlined />} onClick={removeTehran}>
															حذف
														</Button>
													)}
												>
													<ContractTypeSection title="" name={sf("tehranPricing") as any} />
													{showPremiumRevenuePercent
														? (
															<div style={{ marginBottom: 12, marginTop: 12 }}>
																<RHFProNumber
																	name={sf("tehranRevenuePercent") as any}
																	label="درصد سهم درآمد (تهران)"
																	inputProps={{ placeholder: "بین 0 تا 100", inputMode: "numeric" } as any}
																	enableGrouping={false}
																	enableWordsTooltip={false}
																/>
															</div>
														)
														: null}
												</ProCard>

											</Row>
										)
										: null}
								</ProCard>
							</Row>

							<Row>
								<ProCard bordered headerBordered style={{ borderRadius: 6, marginTop: 12 }} bodyStyle={{ padding: 16 }}>
									<Row>
										<Button onClick={addProvince} disabled={!!provincePricing}>افزودن قرارداد مراکز استانی</Button>
									</Row>

									{provincePricing
										? (
											<Row>
												<ProCard
													bordered
													headerBordered
													style={{ borderRadius: 6, marginTop: 12 }}
													bodyStyle={{ padding: 16 }}
													title={<span style={{ fontWeight: 700 }}>قرارداد مراکز استانی</span>}
													extra={(
														<Button danger size="small" icon={<DeleteOutlined />} onClick={removeProvince}>
															حذف
														</Button>
													)}
												>
													<ContractTypeSection title="" name={sf("provincePricing") as any} />
													{showPremiumRevenuePercent
														? (
															<div style={{ marginBottom: 12, marginTop: 12 }}>
																<RHFProNumber
																	name={sf("provinceRevenuePercent") as any}
																	label="درصد سهم درآمد (مراکز استانی)"
																	inputProps={{ placeholder: "بین 0 تا 100", inputMode: "numeric" } as any}
																	enableGrouping={false}
																	enableWordsTooltip={false}
																/>
															</div>
														)
														: null}
												</ProCard>
											</Row>
										)
										: null}
								</ProCard>
							</Row>
						</>
					)
					: null}
			</ProCard>

			{/* ✅ Addenda only when official */}
			{showPricingUi && showAddenda
				? (
					<div style={{ marginTop: 12 }}>
						<ContractAddendaSection<ContractFormValues>
							title="الحاقیه‌های قرارداد (اختیاری)"
							name={sf("addenda") as ArrayPath<ContractFormValues>}
							contractTypeTitle=""
							contractTypeFieldKey="contractPricing"
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
