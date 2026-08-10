import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types.js";
import type { ContractSectionTone } from "#src/features/contract/shared/ui/form/components/contract-form-section-tone";
import type { GlobalToken } from "antd";
import type { CSSProperties } from "react";
import type { ArrayPath, Path } from "react-hook-form";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { ContractTypeSection } from "#src/features/contract/components/contract-type/ContractTypeSection";
import { getContractSectionToneColors } from "#src/features/contract/shared/ui/form/components/contract-form-section-tone";
import { ContractSectionToneContext } from "#src/features/contract/shared/ui/form/components/contract-section-tone-context";
import { ContractFormSection } from "#src/features/contract/shared/ui/form/components/ContractFormSection";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { Tag, theme } from "antd";
import { useContext, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import "./sms.fields.css";

const sf = (path: string) => `serviceFields.${path}` as any;

const SMS_OPERATOR_PRICING_FIELDS = [
	{ key: "irancellFa", title: "ایرانسل - فارسی", color: "gold" },
	{ key: "irancellEn", title: "ایرانسل - انگلیسی", color: "gold" },
	{ key: "hamrahAvalFa", title: "همراه اول - فارسی", color: "blue" },
	{ key: "hamrahAvalEn", title: "همراه اول - انگلیسی", color: "blue" },
	{ key: "otherFa", title: "سایر - فارسی", color: "geekblue" },
	{ key: "otherEn", title: "سایر - انگلیسی", color: "geekblue" },
] as const;

function getOperatorTagStyle(token: GlobalToken, color: "gold" | "blue" | "geekblue", toneOverride: ContractSectionTone | null): CSSProperties {
	if (toneOverride) {
		const toneColors = getContractSectionToneColors(token, toneOverride);
		return {
			borderColor: toneColors.background,
			borderRadius: token.borderRadiusSM,
			backgroundColor: toneColors.background,
			color: toneColors.text,
		};
	}

	const backgroundColor = color === "gold"
		? token.colorWarningBgHover
		: color === "geekblue"
			? token.colorInfoBgHover
			: token.colorPrimaryBgHover;

	return {
		borderColor: backgroundColor,
		borderRadius: token.borderRadiusSM,
		backgroundColor,
		color: token.colorText,
	};
}

function SmsOperatorPricingFields({ base }: { base: string }) {
	const { token } = theme.useToken();
	const inheritedTone = useContext(ContractSectionToneContext);

	return (
		<div className="sms-operator-list">
			{SMS_OPERATOR_PRICING_FIELDS.map(operator => (
				<ContractTypeSection
					key={operator.key}
					title={(
						<Tag className="sms-operator-tag" style={getOperatorTagStyle(token, operator.color, inheritedTone)}>
							{operator.title}
						</Tag>
					)}
					name={`${base}.${operator.key}` as any}
					tone={inheritedTone ?? operator.color}
					variant="sms-operator"
				/>
			))}
		</div>
	);
}

function SmsOperatorRevenueCard({ base }: { base: string }) {
	return (
		<ContractFormSection title="درآمد اپراتورها" className="sms-operator-revenue-card">
			<SmsOperatorPricingFields base={base} />
		</ContractFormSection>
	);
}

function renderMinProfitField(name: string) {
	return (
		<RHFProNumber
			name={name as any}
			label="حداقل کارمزد"
			inputProps={{
				placeholder: "اختیاری",
				addonAfter: "ریال",
			}}
			formItemProps={{ className: "contract-type-currency-field mb-0" }}
			enableGrouping
			enableWordsTooltip
		/>
	);
}

export function SmsFields() {
	const { control } = useFormContext<ContractFormValues>();

	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });

	const showAddenda = useMemo(
		() => startYear != null && startMonth != null && endYear != null && endMonth != null,
		[startYear, startMonth, endYear, endMonth],
	);

	const counterpartyType = useWatch({ control, name: "counterpartyType" });

	const isGovOps = counterpartyType === "gov_ops";
	const isPartners = counterpartyType === "partners";

	return (
		<>
			<SmsOperatorRevenueCard base={sf("operatorRevenue")} />

			{isPartners
				? (
					<>
						<ContractTypeSection title="سهم دولت" name={sf("governmentRevenue")} />
						<ContractTypeSection
							title="تعیین کارمزد و سهم"
							name={sf("profit.pricing")}
							topAside={renderMinProfitField(sf("profit.minProfit"))}
						/>
					</>
				)
				: null}

			{isGovOps
				? (
					<ContractTypeSection title="سهم دولت" name={sf("governmentRate")} />
				)
				: null}

			{showAddenda
				? (
					<ContractAddendaSection<ContractFormValues>
						title="الحاقیه‌های قرارداد (اختیاری)"
						name={sf("addenda") as ArrayPath<ContractFormValues>}
						contractTypeTitle=""
						contractTypeFieldKey="contractPricing"
						renderAddendumFields={base => (
							<>
								<SmsOperatorRevenueCard base={`${base}.operatorRevenue`} />

								{isPartners
									? (
										<>
											<ContractTypeSection title="سهم دولت" name={`${base}.governmentRevenue` as any} />
											<ContractTypeSection
												title="تعیین کارمزد و سهم"
												name={`${base}.profit.pricing` as any}
												topAside={renderMinProfitField(`${base}.profit.minProfit`)}
											/>
										</>
									)
									: null}

								{isGovOps
									? (
										<ContractTypeSection title="سهم دولت" name={`${base}.governmentRate` as any} />
									)
									: null}
							</>
						)}
						contractStartYearPath={"startYear" as Path<ContractFormValues>}
						contractStartMonthPath={"startMonth" as Path<ContractFormValues>}
						contractEndYearPath={"endYear" as Path<ContractFormValues>}
						contractEndMonthPath={"endMonth" as Path<ContractFormValues>}
					/>
				)
				: null}
		</>
	);
}
