import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types.js";
import type { ArrayPath, Path } from "react-hook-form";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import {
	AlignedFormField,
	useAlignedLabelWidth,
} from "#src/shared/ui/aligned-form-field";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const sf = (path: string) => `serviceFields.${path}` as const;

const COMMISSION_LABELS = [
	"کارمزد دریافت اولیه",
	"کارمزد دریافت نهایی",
	"درصد کاراشاب",
	"درصد مخابرات",
	"درصد سهم طرف اول",
	"درصد سهم منطقه",
	"درصد سهم نماینده فروش",
];

function toPercent(v: unknown): number | null {
	if (v === "" || v == null)
		return null;
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : null;
}

function isPercentInRange(v: number) {
	return v >= 0 && v <= 100;
}

function SmsCommissionAddendumPercentSync({ base }: { base: string }) {
	const { control, setValue } = useFormContext<ContractFormValues>();
	const expertRaw = useWatch({ control, name: `${base}.expertPercent` as any });
	const telecomRaw = useWatch({ control, name: `${base}.telecomPercent` as any });
	const firstPartyRaw = useWatch({ control, name: `${base}.firstPartySharePercent` as any });
	const regionRaw = useWatch({ control, name: `${base}.regionSharePercent` as any });
	const salesAgentRaw = useWatch({ control, name: `${base}.salesAgentSharePercent` as any });
	const previousPair = useRef<[number | null, number | null]>([null, null]);
	const previousTriple = useRef<[number | null, number | null, number | null]>([null, null, null]);

	useEffect(() => {
		const values: [number | null, number | null] = [toPercent(expertRaw), toPercent(telecomRaw)];
		const changed = values.map((value, index) => value !== previousPair.current[index]);
		if (changed.filter(Boolean).length === 1) {
			const changedIndex = changed[0] ? 0 : 1;
			const otherIndex = changedIndex === 0 ? 1 : 0;
			const changedValue = values[changedIndex];
			const otherValue = values[otherIndex];
			const targetIndex = changedValue != null ? otherIndex : otherValue != null ? changedIndex : null;
			const remaining = changedValue != null ? 100 - changedValue : otherValue != null ? 100 - otherValue : null;
			if (targetIndex != null && remaining != null && isPercentInRange(remaining) && values[targetIndex] !== remaining) {
				const field = targetIndex === 0 ? "expertPercent" : "telecomPercent";
				setValue(`${base}.${field}` as any, remaining as any, { shouldDirty: true, shouldValidate: true });
			}
		}
		previousPair.current = values;
	}, [base, expertRaw, telecomRaw, setValue]);

	useEffect(() => {
		const values: [number | null, number | null, number | null] = [toPercent(firstPartyRaw), toPercent(regionRaw), toPercent(salesAgentRaw)];
		const changed = values.map((value, index) => value !== previousTriple.current[index]);
		if (changed.filter(Boolean).length === 1) {
			const changedIndex = changed.findIndex(Boolean);
			const otherIndexes = [0, 1, 2].filter(index => index !== changedIndex);
			const changedValue = values[changedIndex];
			let targetIndex: number | null = null;

			if (changedValue == null) {
				if (otherIndexes.every(index => values[index] != null))
					targetIndex = changedIndex;
			}
			else if (values[otherIndexes[0]] != null) {
				targetIndex = otherIndexes[1];
			}
			else if (values[otherIndexes[1]] != null) {
				targetIndex = otherIndexes[0];
			}

			if (targetIndex != null) {
				const sourceIndexes = [0, 1, 2].filter(index => index !== targetIndex);
				const remaining = 100 - (values[sourceIndexes[0]] ?? 0) - (values[sourceIndexes[1]] ?? 0);
				if (isPercentInRange(remaining) && values[targetIndex] !== remaining) {
					const fields = ["firstPartySharePercent", "regionSharePercent", "salesAgentSharePercent"];
					setValue(`${base}.${fields[targetIndex]}` as any, remaining as any, { shouldDirty: true, shouldValidate: true });
				}
			}
		}
		previousTriple.current = values;
	}, [base, firstPartyRaw, regionRaw, salesAgentRaw, setValue]);

	return null;
}

export function SmsCommissionFields() {
	const { control, setValue } = useFormContext<ContractFormValues>();
	const alignedLabelStyle = useAlignedLabelWidth(COMMISSION_LABELS);

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

	function renderCommissionGrid(base?: string) {
		const nameOf = (field: string) => base ? `${base}.${field}` : sf(field);

		return (
			<>
				{base ? <SmsCommissionAddendumPercentSync base={base} /> : null}
				<div
					className="aligned-form-grid aligned-form-grid--two"
					style={alignedLabelStyle}
				>
					<AlignedFormField label="کارمزد دریافت اولیه">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("initialCommission") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 110", addonAfter: "ریال" }}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
					</AlignedFormField>

					<AlignedFormField label="کارمزد دریافت نهایی">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("finalCommission") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 150", addonAfter: "ریال" }}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
					</AlignedFormField>

					<AlignedFormField label="درصد کاراشاب">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("expertPercent") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 20", addonAfter: "درصد" }}
							enableGrouping={false}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
					</AlignedFormField>

					<AlignedFormField label="درصد مخابرات">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("telecomPercent") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 80", addonAfter: "درصد" }}
							enableGrouping={false}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
					</AlignedFormField>

					<AlignedFormField label="درصد سهم طرف اول">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("firstPartySharePercent") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 20", addonAfter: "درصد" }}
							enableGrouping={false}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
					</AlignedFormField>

					<AlignedFormField label="درصد سهم منطقه">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("regionSharePercent") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 30", addonAfter: "درصد" }}
							enableGrouping={false}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
					</AlignedFormField>

					<div className="col-span-full">
						<AlignedFormField label="درصد سهم نماینده فروش">
							<RHFProNumber<ContractFormValues, any>
								name={nameOf("salesAgentSharePercent") as any}
								label=""
								inputProps={{ placeholder: "مثلاً 50", addonAfter: "درصد" }}
								enableGrouping={false}
								formItemProps={{ className: "contract-type-currency-field mb-0" }}
							/>
						</AlignedFormField>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<SectionCard title="کارمزدها و درصدها" tone="gold">
				{renderCommissionGrid()}
			</SectionCard>

			{showAddenda
				? (
					<div className="mt-3">
						<ContractAddendaSection<ContractFormValues>
							title="الحاقیه‌های قرارداد (اختیاری)"
							name={sf("addenda") as ArrayPath<ContractFormValues>}
							renderAddendumFields={base => renderCommissionGrid(base)}
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
