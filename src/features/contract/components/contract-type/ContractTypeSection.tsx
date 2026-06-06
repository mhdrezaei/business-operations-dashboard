import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ProFormGroup } from "@ant-design/pro-components";
import { Button, Card } from "antd";
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
					label="روش محاسبه قیمت"
					options={CONTRACT_TYPE_OPTIONS}
					selectProps={{ placeholder: "انتخاب نوع محاسبه", allowClear: true }}
				/>
			);
		}

		return (
			<div
				className="flex flex-wrap gap-3 items-start"
			>
				<div className="min-w-0 flex-[1_1_320px]">
					<RHFSelect
						name={`${name}.type` as any}
						label="روش محاسبه قیمت"
						options={CONTRACT_TYPE_OPTIONS}
						selectProps={{ placeholder: "انتخاب نوع محاسبه", allowClear: true }}
					/>
				</div>

				<div className="min-w-0 flex-[1_1_320px]">
					{topAside}
				</div>
			</div>
		);
	}

	return (
		<Card bordered className="rounded-md [&_.ant-pro-card-body]:p-4">
			<div className="flex justify-between items-center mb-3">
				<div className="font-bold">{title}</div>
			</div>

			{renderTopRow()}

			{type === "fixed"
				? (
					<div className="mt-3">
						<ProFormGroup>
							<RHFProNumber
								name={`${name}.fixedAmount` as any}
								label="مبلغ (تومان)"
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
					<div className="mt-3">
						<ContractTierTable name={`${name}.rows`} />
					</div>
				)
				: null}

			{type === "tier_blended"
				? (
					<div className="mt-3">
						<div className="font-semibold mb-3">بخش‌های محاسبه قیمتی</div>

						{sectionsFa.fields.map((sectionField, sectionIndex) => (
							<Card
								key={sectionField.id}
								bordered
								className="rounded-xl mb-3 w-full [&_.ant-pro-card-body]:p-3"
								title={(
									<div
										className="flex justify-between items-center w-full"
									>
										<span>{`نوع محاسبه بخش ${sectionIndex + 1}`}</span>

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
									selectProps={{ placeholder: "انتخاب نوع محاسبه", allowClear: true }}
									formItemProps={{ className: "mb-3" }}
								/>

								<ContractTierTable name={`${name}.sections.${sectionIndex}.rows`} />
							</Card>
						))}

						<Button icon={<PlusOutlined />} onClick={addSection}>
							افزودن بخش
						</Button>
					</div>
				)
				: null}
		</Card>
	);
}
