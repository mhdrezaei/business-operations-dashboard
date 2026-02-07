import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard, ProFormGroup } from "@ant-design/pro-components";
import { Button } from "antd";
import React, { useEffect, useRef } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { BLENDED_MODE_OPTIONS, CONTRACT_TYPE_OPTIONS } from "./contract-type.options";
import { ContractTierTable } from "./ContractTierTable";

interface Props {
	title: string
	name: string
}

const DEFAULT_SECTION = {
	mode: null,
	rows: [{ from: null, to: null, fee: null }],
};

export function ContractTypeSection({ title, name }: Props) {
	const { control, getValues } = useFormContext();

	const type = useWatch({ control, name: `${name}.type` as any }) as any;

	const sectionsFa = useFieldArray({ control, name: `${name}.sections` as any });
	const prevTypeRef = useRef<any>(null);

	useEffect(() => {
		// only when we "enter" tier_blended
		if (prevTypeRef.current !== "tier_blended" && type === "tier_blended") {
			const current = (getValues(`${name}.sections` as any) ?? []) as any[];

			sectionsFa.replace(
				(current.length > 0 ? current : [{ mode: null, rows: [{ from: null, to: null, fee: null }] }]) as any,
			);
		}

		prevTypeRef.current = type;
	}, [type, name, getValues, sectionsFa]);

	// ✅ Add a new section (if empty: replace with a section, if not: append)
	const addSection = () => {
		const current = (getValues(`${name}.sections` as any) ?? []) as any[];
		if (current.length === 0) {
			sectionsFa.replace([DEFAULT_SECTION] as any);
			return;
		}
		sectionsFa.append(DEFAULT_SECTION as any);
	};

	return (
		<ProCard bordered style={{ borderRadius: 6 }} bodyStyle={{ padding: 16 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
				<div style={{ fontWeight: 700 }}>{title}</div>
			</div>

			<RHFSelect
				name={`${name}.type` as any}
				label="نوع قرارداد"
				options={CONTRACT_TYPE_OPTIONS}
				selectProps={{ placeholder: "انتخاب کنید", allowClear: true }}
			/>

			{type === "fixed"
				? (
					<div style={{ marginTop: 12 }}>
						<ProFormGroup>
							<RHFProNumber
								name={`${name}.fixedAmount` as any}
								label="مبلغ ثابت (تومان)"
								enableGrouping
								enableWordsTooltip
								inputProps={{ placeholder: "مثلاً 120", inputMode: "numeric" } as any}
							/>
						</ProFormGroup>
					</div>
				)
				: null}

			{type === "tier_fixed" || type === "tier_variable"
				? (
					<div style={{ marginTop: 12 }}>
						<ContractTierTable name={`${name}.rows`} />
					</div>
				)
				: null}

			{type === "tier_blended"
				? (
					<div style={{ marginTop: 12 }}>
						<div style={{ fontWeight: 600, marginBottom: 12 }}>بخش‌های پلکانی تلفیقی</div>

						{sectionsFa.fields.map((s, si) => (
							<ProCard
								key={s.id}
								bordered
								style={{ borderRadius: 12, marginBottom: 12, width: "100%" }}
								bodyStyle={{ padding: 12 }}
								title={(
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											width: "100%",
										}}
									>
										<span>{`بخش ${si + 1}`}</span>

										<Button
											danger
											size="small"
											icon={<DeleteOutlined />}
											disabled={sectionsFa.fields.length <= 1}
											onClick={(e) => {
												e.stopPropagation();
												sectionsFa.remove(si);
											}}
										>
											حذف بخش
										</Button>
									</div>
								)}
							>
								<RHFSelect
									name={`${name}.sections.${si}.mode` as any}
									label=""
									options={BLENDED_MODE_OPTIONS}
									selectProps={{ placeholder: "انتخاب کنید", allowClear: true }}
									formItemProps={{ style: { marginBottom: 12 } }}
								/>

								<ContractTierTable name={`${name}.sections.${si}.rows`} />
							</ProCard>
						))}

						<Button icon={<PlusOutlined />} onClick={addSection}>
							افزودن بخش جدید
						</Button>
					</div>
				)
				: null}
		</ProCard>
	);
}
