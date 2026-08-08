import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ProFormGroup } from "@ant-design/pro-components";
import { Button, Card, Form, Select } from "antd";
import React, { useEffect, useRef } from "react";
import { useController, useFieldArray, useFormContext, useWatch } from "react-hook-form";
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
	const typePath = `${name}.type` as any;
	const sectionsPath = `${name}.sections` as any;
	const {
		field: typeField,
		fieldState: typeFieldState,
		formState,
	} = useController({
		control,
		name: typePath,
		defaultValue: getValues(typePath),
	});
	const type = typeField.value as any;
	const typeError = formState.isSubmitted || typeFieldState.isTouched ? typeFieldState.error?.message : undefined;

	const sectionsFa = useFieldArray({ control, name: sectionsPath });
	const sections = useWatch({
		control,
		name: sectionsPath,
		defaultValue: getValues(sectionsPath),
	}) as Array<{
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
		const typeSelect = (
			<Form.Item
				label="روش محاسبه قیمت"
				help={typeError}
				validateStatus={typeError ? "error" : undefined}
			>
				<Select
					placeholder="انتخاب نوع محاسبه"
					allowClear
					options={CONTRACT_TYPE_OPTIONS}
					value={typeField.value}
					onChange={typeField.onChange}
					onBlur={typeField.onBlur}
					ref={typeField.ref as any}
					status={typeError ? "error" : undefined}
				/>
			</Form.Item>
		);

		if (!topAside) {
			return typeSelect;
		}

		return (
			<div
				className="flex flex-wrap gap-3 items-start"
			>
				<div className="min-w-0 flex-[1_1_320px]">
					{typeSelect}
				</div>

				<div className="min-w-0 flex-[1_1_320px]">
					{topAside}
				</div>
			</div>
		);
	}

	return (
		<Card variant="outlined" className="rounded-md [&_.ant-pro-card-body]:p-4">
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
