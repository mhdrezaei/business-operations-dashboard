import type { SectionTone } from "#src/shared/ui/section-card";
import type { ContractType } from "./contract-type.types";
import { DashedBorder } from "#src/shared/ui/dashed-border";
import { RHFProNumber, RHFSegmentedSwitch, RHFSelect } from "#src/shared/ui/rhf-pro";
import { getSectionToneColors, SectionCard, SectionToneContext } from "#src/shared/ui/section-card";
import { DeleteOutlined, PlusOutlined, QuestionCircleOutlined } from "@ant-design/icons";

import { Button, Card, theme, Tooltip } from "antd";
import React, { useEffect, useRef } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { BLENDED_MODE_OPTIONS, CONTRACT_TYPE_OPTIONS } from "./contract-type.options";
import { ContractTierTable } from "./ContractTierTable";

interface Props {
	title: React.ReactNode
	name: string
	topAside?: React.ReactNode
	bottomAside?: React.ReactNode
	tone?: SectionTone
	variant?: "default" | "embedded" | "sms-operator"
	showRatePercentage?: boolean
	ratePercentageHelpText?: React.ReactNode
	compactCalculationModel?: boolean
	blendedModePlaceholder?: string
	contractTypeOptions?: Array<{ label: string, value: ContractType, disabled?: boolean }>
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

export function ContractTypeSection({ title, name, topAside, bottomAside, tone = "primary", variant = "default", showRatePercentage = false, ratePercentageHelpText, compactCalculationModel = true, blendedModePlaceholder, contractTypeOptions = CONTRACT_TYPE_OPTIONS }: Props) {
	const { control, getValues, setValue } = useFormContext();
	const { t } = useTranslation();
	const inheritedTone = React.useContext(SectionToneContext);
	const resolvedTone = inheritedTone ?? tone;
	const isSmsOperator = variant === "sms-operator";
	const isEmbedded = variant === "embedded";
	const { token } = theme.useToken();
	const smsOperatorRadius = token.paddingLG + token.borderRadiusSM;
	const smsBlendedRadius = smsOperatorRadius;
	const smsDashLength = token.sizeXS - token.lineWidthBold;
	const smsDashGap = token.paddingXXS;
	const smsBorderColor = token.colorSplit;
	const blendedCardRadius = compactCalculationModel ? 30 : smsBlendedRadius;
	const blendedDashLength = compactCalculationModel ? 6 : smsDashLength;
	const blendedDashGap = compactCalculationModel ? 6 : smsDashGap;
	const toneColors = getSectionToneColors(token, resolvedTone);
	const smsCardStyle = isSmsOperator
		? {
			"--sms-operator-border-color": smsBorderColor,
			"--sms-operator-border-width": `${token.lineWidth}px`,
			"--sms-operator-radius": `${smsOperatorRadius}px`,
			"--sms-operator-blended-radius": `${smsBlendedRadius}px`,
			"--sms-operator-card-bg": token.colorBgLayout,
			"--sms-operator-addon-bg": token.colorPrimary,
			"--sms-operator-addon-border-color": token.colorPrimary,
			"--sms-operator-addon-text-color": token.colorTextLightSolid,
			"--contract-section-danger-border-color": token.colorSplit,
			"--contract-section-nested-bg": token.colorBgLayout,
			"--contract-section-accent-bg": toneColors.background,
			"--contract-section-accent-color": toneColors.text,
			"--contract-section-tag-radius": `${token.borderRadiusSM}px`,
		} as React.CSSProperties
		: undefined;

	function renderDashedBorder(radius: number, dashLength = smsDashLength, dashGap = smsDashGap) {
		return <DashedBorder radius={radius} dashLength={dashLength} dashGap={dashGap} />;
	}
	const typePath = `${name}.type` as any;
	const sectionsPath = `${name}.sections` as any;
	const type = useWatch({
		control,
		name: typePath,
		defaultValue: getValues(typePath),
	}) as any;

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
		const typeSwitch = (
			<RHFSegmentedSwitch
				name={typePath}
				label={compactCalculationModel ? "" : t("contract.type.calculationModel")}
				options={contractTypeOptions}
				segmentedProps={{ block: true }}
				formItemProps={{ className: "mb-0" }}
			/>
		);
		const fixedAmount = (
			<RHFProNumber
				name={`${name}.fixedAmount` as any}
				label={showRatePercentage ? t("contract.type.fixedAmountRial") : t("contract.type.unitAmount")}
				enableGrouping
				enableWordsTooltip
				inputProps={{ placeholder: t("contract.type.amountPlaceholder"), inputMode: "numeric", addonAfter: t("contract.unit.rial") } as any}
				formItemProps={{ className: "contract-type-currency-field contract-type-unit-amount-field mb-0" }}
			/>
		);
		const ratePercentage = (
			<RHFProNumber
				name={`${name}.ratePercentage` as any}
				label={(
					<span className="inline-flex items-center gap-1">
						{t("contract.type.ratePercentage")}
						<Tooltip title={ratePercentageHelpText}>
							<button
								type="button"
								aria-label={t("contract.type.ratePercentageHelp")}
								className="inline-flex cursor-help border-0 bg-transparent p-0 text-warning"
							>
								<QuestionCircleOutlined />
							</button>
						</Tooltip>
					</span>
				)}
				enableGrouping={false}
				enableWordsTooltip={false}
				inputProps={{ placeholder: t("contract.type.percentRangePlaceholder"), inputMode: "numeric" } as any}
				formItemProps={{ className: "mb-0" }}
			/>
		);

		if (isSmsOperator) {
			return (
				<div className="sms-operator-pricing-fields">
					<div className="min-w-0">{typeSwitch}</div>
					{type === "fixed" ? <div className="min-w-0">{fixedAmount}</div> : null}
				</div>
			);
		}

		return (
			<div className={`contract-type-standard-fields ${compactCalculationModel ? "contract-type-standard-fields--compact" : ""}`}>
				<div className="contract-type-standard-fields__switch min-w-0">
					{typeSwitch}
				</div>
				{type === "fixed"
					? <div className="contract-type-standard-fields__amount min-w-0">{fixedAmount}</div>
					: null}
				{type === "fixed" && showRatePercentage
					? <div className="contract-type-standard-fields__amount min-w-0">{ratePercentage}</div>
					: null}
				{topAside
					? <div className="contract-type-standard-fields__aside min-w-0">{topAside}</div>
					: null}
			</div>
		);
	}

	const content = (
		<>
			{isSmsOperator
				? (
					<div className="flex justify-between items-center mb-6">
						<div className="font-bold">{title}</div>
					</div>
				)
				: null}

			{renderTopRow()}

			{type === "tier_fixed" || type === "tier_variable"
				? (
					<div className={isSmsOperator ? "sms-operator-pricing-details" : "mt-3"}>
						<Card
							bordered
							style={{ "--contract-blended-radius": `${smsBlendedRadius}px` } as React.CSSProperties}
							className="contract-tier-card w-full [&_.ant-pro-card-body]:p-4"
						>
							{renderDashedBorder(smsBlendedRadius)}
							<ContractTierTable
								name={`${name}.rows`}
								variant="embedded"
								currencyAddon={t("contract.unit.rial")}
								showRatePercentage={showRatePercentage}
								ratePercentageHelpText={ratePercentageHelpText}
							/>
						</Card>
					</div>
				)
				: null}

			{type === "tier_blended"
				? (
					<div className={isSmsOperator ? "sms-operator-pricing-details" : "mt-3"}>
						{sectionsFa.fields.map((sectionField, sectionIndex) => (
							<Card
								key={sectionField.id}
								bordered
								style={{ "--contract-blended-radius": `${blendedCardRadius}px` } as React.CSSProperties}
								className={`contract-blended-card ${compactCalculationModel ? "contract-blended-card--openapi" : ""} mb-3 w-full [&_.ant-pro-card-body]:p-4`}
							>
								{renderDashedBorder(blendedCardRadius, blendedDashLength, blendedDashGap)}
								<div className="contract-blended-card__toolbar">
									<span className="contract-blended-index-badge">{sectionIndex + 1}</span>
									<div className="min-w-0 flex-1">
										<RHFSelect
											name={`${name}.sections.${sectionIndex}.mode` as any}
											label=""
											options={BLENDED_MODE_OPTIONS}
											selectProps={{ placeholder: blendedModePlaceholder ?? t("contract.type.blendedModePlaceholder"), allowClear: true }}
											formItemProps={{ className: "mb-0" }}
										/>
									</div>
									<Button
										danger
										className="contract-dashed-action"
										icon={<DeleteOutlined />}
										disabled={sectionsFa.fields.length <= 1}
										onClick={() => handleRemoveSection(sectionIndex)}
									>
										{t("contract.type.removeSection")}
									</Button>
								</div>

								<div className="contract-blended-card__tiers">
									<ContractTierTable
										name={`${name}.sections.${sectionIndex}.rows`}
										variant="embedded"
										currencyAddon={t("contract.unit.rial")}
										showRatePercentage={showRatePercentage}
										ratePercentageHelpText={ratePercentageHelpText}
									/>
								</div>
							</Card>
						))}

						<Button className="contract-dashed-action" icon={<PlusOutlined />} onClick={addSection}>
							{t("contract.type.addCalculationModel")}
						</Button>
					</div>
				)
				: null}

			{bottomAside ? <div className="mt-4">{bottomAside}</div> : null}
		</>
	);

	if (isEmbedded) {
		return content;
	}

	if (!isSmsOperator) {
		return (
			<SectionCard title={title || t("contract.type.calculationType")} tone={tone} className="mt-3">
				{content}
			</SectionCard>
		);
	}

	return (
		<Card
			variant="outlined"
			style={smsCardStyle}
			className="sms-operator-pricing-card [&_.ant-pro-card-body]:p-4"
		>
			{renderDashedBorder(smsOperatorRadius)}
			{content}
		</Card>
	);
}
