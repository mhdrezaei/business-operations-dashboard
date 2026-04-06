import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types.js";
import type { ArrayPath, Path } from "react-hook-form";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const sf = (path: string) => `serviceFields.${path}` as const;

function toPercent(v: unknown): number | null {
	if (v === "" || v == null)
		return null;
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : null;
}

function isPercentInRange(v: number) {
	return v >= 0 && v <= 100;
}

export function SmsCommissionFields() {
	const { control, setValue } = useFormContext<ContractFormValues>();

	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });
	const expertPercentRaw = useWatch({ control, name: sf("expertPercent") as any });
	const telecomPercentRaw = useWatch({ control, name: sf("telecomPercent") as any });
	const firstPartySharePercentRaw = useWatch({ control, name: sf("firstPartySharePercent") as any });
	const regionSharePercentRaw = useWatch({ control, name: sf("regionSharePercent") as any });
	const salesAgentSharePercentRaw = useWatch({ control, name: sf("salesAgentSharePercent") as any });

	const prevExpertTelecomRef = useRef<{
		expertPercent: number | null
		telecomPercent: number | null
	}>({
		expertPercent: null,
		telecomPercent: null,
	});
	const prevShareTripleRef = useRef<{
		firstPartySharePercent: number | null
		regionSharePercent: number | null
		salesAgentSharePercent: number | null
	}>({
		firstPartySharePercent: null,
		regionSharePercent: null,
		salesAgentSharePercent: null,
	});

	const showAddenda = useMemo(
		() => startYear != null && startMonth != null && endYear != null && endMonth != null,
		[startYear, startMonth, endYear, endMonth],
	);

	useEffect(() => {
		const expertPercent = toPercent(expertPercentRaw);
		const telecomPercent = toPercent(telecomPercentRaw);
		const prev = prevExpertTelecomRef.current;

		const expertChanged = expertPercent !== prev.expertPercent;
		const telecomChanged = telecomPercent !== prev.telecomPercent;

		if (expertChanged && !telecomChanged) {
			if (expertPercent != null) {
				const remaining = 100 - expertPercent;
				if (isPercentInRange(remaining) && telecomPercent !== remaining) {
					setValue(sf("telecomPercent") as any, remaining as any, {
						shouldDirty: true,
						shouldValidate: true,
					});
				}
			}
			else if (telecomPercent != null) {
				const remaining = 100 - telecomPercent;
				if (isPercentInRange(remaining) && expertPercent !== remaining) {
					setValue(sf("expertPercent") as any, remaining as any, {
						shouldDirty: true,
						shouldValidate: true,
					});
				}
			}
		}

		if (telecomChanged && !expertChanged) {
			if (telecomPercent != null) {
				const remaining = 100 - telecomPercent;
				if (isPercentInRange(remaining) && expertPercent !== remaining) {
					setValue(sf("expertPercent") as any, remaining as any, {
						shouldDirty: true,
						shouldValidate: true,
					});
				}
			}
			else if (expertPercent != null) {
				const remaining = 100 - expertPercent;
				if (isPercentInRange(remaining) && telecomPercent !== remaining) {
					setValue(sf("telecomPercent") as any, remaining as any, {
						shouldDirty: true,
						shouldValidate: true,
					});
				}
			}
		}

		prevExpertTelecomRef.current = {
			expertPercent,
			telecomPercent,
		};
	}, [expertPercentRaw, telecomPercentRaw, setValue]);

	useEffect(() => {
		const firstPartySharePercent = toPercent(firstPartySharePercentRaw);
		const regionSharePercent = toPercent(regionSharePercentRaw);
		const salesAgentSharePercent = toPercent(salesAgentSharePercentRaw);
		const prev = prevShareTripleRef.current;

		const firstChanged = firstPartySharePercent !== prev.firstPartySharePercent;
		const regionChanged = regionSharePercent !== prev.regionSharePercent;
		const salesChanged = salesAgentSharePercent !== prev.salesAgentSharePercent;
		const changedCount = [firstChanged, regionChanged, salesChanged].filter(Boolean).length;

		if (changedCount === 1) {
			if (firstChanged) {
				if (firstPartySharePercent != null) {
					if (regionSharePercent != null) {
						const remaining = 100 - firstPartySharePercent - regionSharePercent;
						if (isPercentInRange(remaining) && salesAgentSharePercent !== remaining) {
							setValue(sf("salesAgentSharePercent") as any, remaining as any, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}
					}
					else if (salesAgentSharePercent != null) {
						const remaining = 100 - firstPartySharePercent - salesAgentSharePercent;
						if (isPercentInRange(remaining) && regionSharePercent !== remaining) {
							setValue(sf("regionSharePercent") as any, remaining as any, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}
					}
				}
				else if (regionSharePercent != null && salesAgentSharePercent != null) {
					const remaining = 100 - regionSharePercent - salesAgentSharePercent;
					if (isPercentInRange(remaining) && firstPartySharePercent !== remaining) {
						setValue(sf("firstPartySharePercent") as any, remaining as any, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
			}
			else if (regionChanged) {
				if (regionSharePercent != null) {
					if (firstPartySharePercent != null) {
						const remaining = 100 - regionSharePercent - firstPartySharePercent;
						if (isPercentInRange(remaining) && salesAgentSharePercent !== remaining) {
							setValue(sf("salesAgentSharePercent") as any, remaining as any, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}
					}
					else if (salesAgentSharePercent != null) {
						const remaining = 100 - regionSharePercent - salesAgentSharePercent;
						if (isPercentInRange(remaining) && firstPartySharePercent !== remaining) {
							setValue(sf("firstPartySharePercent") as any, remaining as any, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}
					}
				}
				else if (firstPartySharePercent != null && salesAgentSharePercent != null) {
					const remaining = 100 - firstPartySharePercent - salesAgentSharePercent;
					if (isPercentInRange(remaining) && regionSharePercent !== remaining) {
						setValue(sf("regionSharePercent") as any, remaining as any, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
			}
			else if (salesChanged) {
				if (salesAgentSharePercent != null) {
					if (firstPartySharePercent != null) {
						const remaining = 100 - salesAgentSharePercent - firstPartySharePercent;
						if (isPercentInRange(remaining) && regionSharePercent !== remaining) {
							setValue(sf("regionSharePercent") as any, remaining as any, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}
					}
					else if (regionSharePercent != null) {
						const remaining = 100 - salesAgentSharePercent - regionSharePercent;
						if (isPercentInRange(remaining) && firstPartySharePercent !== remaining) {
							setValue(sf("firstPartySharePercent") as any, remaining as any, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}
					}
				}
				else if (firstPartySharePercent != null && regionSharePercent != null) {
					const remaining = 100 - firstPartySharePercent - regionSharePercent;
					if (isPercentInRange(remaining) && salesAgentSharePercent !== remaining) {
						setValue(sf("salesAgentSharePercent") as any, remaining as any, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
			}
		}

		prevShareTripleRef.current = {
			firstPartySharePercent,
			regionSharePercent,
			salesAgentSharePercent,
		};
	}, [firstPartySharePercentRaw, regionSharePercentRaw, salesAgentSharePercentRaw, setValue]);

	return (
		<>
			<ProCard bordered headerBordered style={{ borderRadius: 6 }} bodyStyle={{ padding: 16 }}>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
						gap: 12,
					}}
				>
					<RHFProNumber<ContractFormValues, any>
						name={sf("initialCommission") as any}
						label="کارمزد دریافت اولیه"
						inputProps={{ placeholder: "مثلا 110" }}
					/>

					<RHFProNumber<ContractFormValues, any>
						name={sf("finalCommission") as any}
						label="کارمزد دریافت نهایی"
						inputProps={{ placeholder: "مثلا 150" }}
					/>

					<RHFProNumber<ContractFormValues, any>
						name={sf("expertPercent") as any}
						label="درصد کارشناسی"
						inputProps={{ placeholder: "مثلا 20" }}
						enableGrouping={false}
					/>

					<RHFProNumber<ContractFormValues, any>
						name={sf("telecomPercent") as any}
						label="درصد مخابرات"
						inputProps={{ placeholder: "مثلا 80" }}
						enableGrouping={false}
					/>

					<RHFProNumber<ContractFormValues, any>
						name={sf("firstPartySharePercent") as any}
						label="درصد سهم طرف اول"
						inputProps={{ placeholder: "مثلا 20" }}
						enableGrouping={false}
					/>

					<RHFProNumber<ContractFormValues, any>
						name={sf("regionSharePercent") as any}
						label="درصد سهم منطقه"
						inputProps={{ placeholder: "مثلا 30" }}
						enableGrouping={false}
					/>

					<div style={{ gridColumn: "1 / -1" }}>
						<RHFProNumber<ContractFormValues, any>
							name={sf("salesAgentSharePercent") as any}
							label="درصد سهم نماینده فروش"
							inputProps={{ placeholder: "مثلا 50" }}
							enableGrouping={false}
						/>
					</div>
				</div>
			</ProCard>

			{showAddenda
				? (
					<div style={{ marginTop: 12 }}>
						<ContractAddendaSection<ContractFormValues>
							title="الحاقیه‌های قرارداد (اختیاری)"
							name={sf("addenda") as ArrayPath<ContractFormValues>}
							renderAddendumFields={base => (
								<div
									style={{
										display: "grid",
										gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
										gap: 12,
									}}
								>
									<RHFProNumber<ContractFormValues, any>
										name={`${base}.initialCommission` as any}
										label="کارمزد دریافت اولیه"
										inputProps={{ placeholder: "مثلا 110" }}
									/>
									<RHFProNumber<ContractFormValues, any>
										name={`${base}.finalCommission` as any}
										label="کارمزد دریافت نهایی"
										inputProps={{ placeholder: "مثلا 150" }}
									/>
									<RHFProNumber<ContractFormValues, any>
										name={`${base}.expertPercent` as any}
										label="درصد کارشناسی"
										inputProps={{ placeholder: "مثلا 20" }}
										enableGrouping={false}
									/>
									<RHFProNumber<ContractFormValues, any>
										name={`${base}.telecomPercent` as any}
										label="درصد مخابرات"
										inputProps={{ placeholder: "مثلا 80" }}
										enableGrouping={false}
									/>
									<RHFProNumber<ContractFormValues, any>
										name={`${base}.firstPartySharePercent` as any}
										label="درصد سهم طرف اول"
										inputProps={{ placeholder: "مثلا 20" }}
										enableGrouping={false}
									/>
									<RHFProNumber<ContractFormValues, any>
										name={`${base}.regionSharePercent` as any}
										label="درصد سهم منطقه"
										inputProps={{ placeholder: "مثلا 30" }}
										enableGrouping={false}
									/>
									<div style={{ gridColumn: "1 / -1" }}>
										<RHFProNumber<ContractFormValues, any>
											name={`${base}.salesAgentSharePercent` as any}
											label="درصد سهم نماینده فروش"
											inputProps={{ placeholder: "مثلا 50" }}
											enableGrouping={false}
										/>
									</div>
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
		</>
	);
}
