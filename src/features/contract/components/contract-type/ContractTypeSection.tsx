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
	topAside?: React.ReactNode
}

function createDefaultRows() {
	return [
		{ from: null, to: null, fee: null },
	];
}

function createDefaultSection(firstRowFrom: number | null = null) {
	return {
		mode: null,
		rows: [
			{ from: firstRowFrom, to: null, fee: null },
			{ from: null, to: null, fee: null },
		],
	};
}

export function ContractTypeSection({ title, name, topAside }: Props) {
	const { control, getValues, setValue } = useFormContext();

	const type = useWatch({ control, name: `${name}.type` as any }) as any;

	const sectionsFa = useFieldArray({ control, name: `${name}.sections` as any });
	const sections = useWatch({ control, name: `${name}.sections` as any }) as Array<{
		mode: "fixed" | "variable" | null
		rows: Array<{ from: number | null, to: number | null, fee: number | null }>
	}> | undefined;
	const prevTypeRef = useRef<any>(undefined);

	useEffect(() => {
		const prevType = prevTypeRef.current;

		if (
			prevType !== type
			&& (type === "tier_fixed" || type === "tier_variable")
		) {
			const currentRows = (getValues(`${name}.rows` as any) ?? []) as any[];
			if (currentRows.length < 1) {
				setValue(`${name}.rows` as any, createDefaultRows() as any, {
					shouldDirty: true,
					shouldValidate: false,
				});
			}
		}

		if (prevType !== "tier_blended" && type === "tier_blended") {
			const current = (getValues(`${name}.sections` as any) ?? []) as any[];
			sectionsFa.replace(
				(current.length > 0 ? current : [createDefaultSection()]) as any,
			);
		}

		prevTypeRef.current = type;
	}, [type, name, getValues, setValue, sectionsFa]);

	useEffect(() => {
		if (type !== "tier_blended" || !sections || sections.length < 2)
			return;

		for (let sectionIndex = 1; sectionIndex < sections.length; sectionIndex++) {
			const previousSection = sections[sectionIndex - 1];
			const currentSection = sections[sectionIndex];
			const previousRows = Array.isArray(previousSection?.rows) ? previousSection.rows : [];
			const currentRows = Array.isArray(currentSection?.rows) ? currentSection.rows : [];

			if (currentRows.length === 0)
				continue;

			const previousLastTo = previousRows.length > 0 ? (previousRows[previousRows.length - 1]?.to ?? null) : null;
			const currentFirstFrom = currentRows[0]?.from ?? null;
			if (currentFirstFrom !== previousLastTo) {
				setValue(`${name}.sections.${sectionIndex}.rows.0.from` as any, previousLastTo, {
					shouldDirty: true,
					shouldValidate: true,
				});
			}
		}
	}, [type, sections, name, setValue]);

	function addSection() {
		const current = (getValues(`${name}.sections` as any) ?? []) as any[];
		if (current.length === 0) {
			sectionsFa.replace([createDefaultSection()] as any);
			return;
		}

		const previousSection = current[current.length - 1];
		const previousRows = Array.isArray(previousSection?.rows) ? previousSection.rows : [];
		const previousLastTo = previousRows.length > 0 ? (previousRows[previousRows.length - 1]?.to ?? null) : null;
		sectionsFa.append(createDefaultSection(previousLastTo) as any);
	}

	function handleRemoveSection(index: number) {
		sectionsFa.remove(index);
	}

	function renderTopRow() {
		if (!topAside) {
			return (
				<RHFSelect
					name={`${name}.type` as any}
					label="نوع قرارداد"
					options={CONTRACT_TYPE_OPTIONS}
					selectProps={{ placeholder: "انتخاب کنید", allowClear: true }}
				/>
			);
		}

		return (
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: 12,
					alignItems: "flex-start",
				}}
			>
				<div style={{ flex: "1 1 320px", minWidth: 0 }}>
					<RHFSelect
						name={`${name}.type` as any}
						label="نوع قرارداد"
						options={CONTRACT_TYPE_OPTIONS}
						selectProps={{ placeholder: "انتخاب کنید", allowClear: true }}
					/>
				</div>

				<div style={{ flex: "1 1 320px", minWidth: 0 }}>
					{topAside}
				</div>
			</div>
		);
	}

	return (
		<ProCard bordered style={{ borderRadius: 6 }} bodyStyle={{ padding: 16 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
				<div style={{ fontWeight: 700 }}>{title}</div>
			</div>

			{renderTopRow()}

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

						{sectionsFa.fields.map((sectionField, sectionIndex) => (
							<ProCard
								key={sectionField.id}
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
										<span>{`بخش ${sectionIndex + 1}`}</span>

										<Button
											danger
											size="small"
											icon={<DeleteOutlined />}
											disabled={sectionsFa.fields.length <= 1}
											onClick={(event) => {
												event.stopPropagation();
												handleRemoveSection(sectionIndex);
											}}
										>
											حذف بخش
										</Button>
									</div>
								)}
							>
								<RHFSelect
									name={`${name}.sections.${sectionIndex}.mode` as any}
									label=""
									options={BLENDED_MODE_OPTIONS}
									selectProps={{ placeholder: "انتخاب کنید", allowClear: true }}
									formItemProps={{ style: { marginBottom: 12 } }}
								/>

								<ContractTierTable name={`${name}.sections.${sectionIndex}.rows`} />
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
