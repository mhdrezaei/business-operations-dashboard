import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types.js";
import type { ArrayPath, Path } from "react-hook-form";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import {
	ContractAlignedField,
	useContractAlignedLabelWidth,
} from "#src/features/contract/shared/ui/form/components/ContractAlignedField";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { Card } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const sf = (path: string) => `serviceFields.${path}` as const;

const COMMISSION_LABELS = [
	"کارمزد دریافت اولیه",
	"کارمزد دریافت نهایی",
	"درصد کارشناسی",
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

export function SmsCommissionFields() {
	const { control, setValue } = useFormContext<ContractFormValues>();
	const alignedLabelStyle = useContractAlignedLabelWidth(COMMISSION_LABELS);

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
			<div
				className="grid grid-cols-2 gap-3"
				style={alignedLabelStyle}
			>
				<ContractAlignedField label="کارمزد دریافت اولیه">
					<RHFProNumber<ContractFormValues, any>
						name={nameOf("initialCommission") as any}
						label=""
						inputProps={{ placeholder: "مثلاً 110" }}
						formItemProps={{ className: "mb-0" }}
					/>
				</ContractAlignedField>

				<ContractAlignedField label="کارمزد دریافت نهایی">
					<RHFProNumber<ContractFormValues, any>
						name={nameOf("finalCommission") as any}
						label=""
						inputProps={{ placeholder: "مثلاً 150" }}
						formItemProps={{ className: "mb-0" }}
					/>
				</ContractAlignedField>

				<ContractAlignedField label="درصد کارشناسی">
					<RHFProNumber<ContractFormValues, any>
						name={nameOf("expertPercent") as any}
						label=""
						inputProps={{ placeholder: "مثلاً 20" }}
						enableGrouping={false}
						formItemProps={{ className: "mb-0" }}
					/>
				</ContractAlignedField>

				<ContractAlignedField label="درصد مخابرات">
					<RHFProNumber<ContractFormValues, any>
						name={nameOf("telecomPercent") as any}
						label=""
						inputProps={{ placeholder: "مثلاً 80" }}
						enableGrouping={false}
						formItemProps={{ className: "mb-0" }}
					/>
				</ContractAlignedField>

				<ContractAlignedField label="درصد سهم طرف اول">
					<RHFProNumber<ContractFormValues, any>
						name={nameOf("firstPartySharePercent") as any}
						label=""
						inputProps={{ placeholder: "مثلاً 20" }}
						enableGrouping={false}
						formItemProps={{ className: "mb-0" }}
					/>
				</ContractAlignedField>

				<ContractAlignedField label="درصد سهم منطقه">
					<RHFProNumber<ContractFormValues, any>
						name={nameOf("regionSharePercent") as any}
						label=""
						inputProps={{ placeholder: "مثلاً 30" }}
						enableGrouping={false}
						formItemProps={{ className: "mb-0" }}
					/>
				</ContractAlignedField>

				<div className="col-span-full">
					<ContractAlignedField label="درصد سهم نماینده فروش">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("salesAgentSharePercent") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 50" }}
							enableGrouping={false}
							formItemProps={{ className: "mb-0" }}
						/>
					</ContractAlignedField>
				</div>
			</div>
		);
	}

	return (
		<>
			<Card variant="outlined" className="rounded-md [&_.ant-pro-card-body]:p-4">
				{renderCommissionGrid()}
			</Card>

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
