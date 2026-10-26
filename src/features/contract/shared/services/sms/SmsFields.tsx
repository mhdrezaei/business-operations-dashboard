import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types.js";
import type { SectionTone } from "#src/shared/ui/section-card";
import type { GlobalToken } from "antd";
import type { CSSProperties } from "react";
import type { ArrayPath, Path } from "react-hook-form";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { ContractTypeSection } from "#src/features/contract/components/contract-type/ContractTypeSection";
import { i18n } from "#src/locales";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { getSectionToneColors, SectionCard, SectionToneContext } from "#src/shared/ui/section-card";

import { Tag, theme } from "antd";
import { useContext, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import "./sms.fields.css";

const sf = (path: string) => `serviceFields.${path}` as any;

const SMS_OPERATOR_PRICING_FIELDS = [
	{ key: "irancellFa", titleKey: "contract.sms.operators.irancellFa", color: "gold" },
	{ key: "irancellEn", titleKey: "contract.sms.operators.irancellEn", color: "gold" },
	{ key: "hamrahAvalFa", titleKey: "contract.sms.operators.hamrahAvalFa", color: "blue" },
	{ key: "hamrahAvalEn", titleKey: "contract.sms.operators.hamrahAvalEn", color: "blue" },
	{ key: "otherFa", titleKey: "contract.sms.operators.otherFa", color: "geekblue" },
	{ key: "otherEn", titleKey: "contract.sms.operators.otherEn", color: "geekblue" },
] as const;

function getOperatorTagStyle(token: GlobalToken, color: "gold" | "blue" | "geekblue", toneOverride: SectionTone | null): CSSProperties {
	if (toneOverride) {
		const toneColors = getSectionToneColors(token, toneOverride);
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
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const inheritedTone = useContext(SectionToneContext);

	return (
		<div className="sms-operator-list">
			{SMS_OPERATOR_PRICING_FIELDS.map(operator => (
				<ContractTypeSection
					key={operator.key}
					title={(
						<Tag className="sms-operator-tag" style={getOperatorTagStyle(token, operator.color, inheritedTone)}>
							{t(operator.titleKey)}
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
	const { t } = useTranslation();
	return (
		<SectionCard title={t("contract.sms.operatorRevenue")} className="sms-operator-revenue-card">
			<SmsOperatorPricingFields base={base} />
		</SectionCard>
	);
}

function renderMinProfitField(name: string) {
	return (
		<RHFProNumber
			name={name as any}
			label={i18n.t("contract.sms.minProfit")}
			inputProps={{
				placeholder: i18n.t("contract.sms.optional"),
				addonAfter: i18n.t("contract.unit.rial"),
			}}
			formItemProps={{ className: "contract-type-currency-field mb-0" }}
			enableGrouping
			enableWordsTooltip
		/>
	);
}

export function SmsFields() {
	const { t } = useTranslation();
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
						<ContractTypeSection title={t("contract.sms.governmentShare")} name={sf("governmentRevenue")} />
						<ContractTypeSection
							title={t("contract.sms.feeAndShare")}
							name={sf("profit.pricing")}
							topAside={renderMinProfitField(sf("profit.minProfit"))}
						/>
					</>
				)
				: null}

			{isGovOps
				? (
					<ContractTypeSection title={t("contract.sms.governmentShare")} name={sf("governmentRate")} />
				)
				: null}

			{showAddenda
				? (
					<ContractAddendaSection<ContractFormValues>
						title={t("contract.addenda.title")}
						name={sf("addenda") as ArrayPath<ContractFormValues>}
						contractTypeTitle=""
						contractTypeFieldKey="contractPricing"
						canAddAddendum={isGovOps || isPartners}
						addendumAddBlockedMessage={t("contract.addenda.selectCounterparty")}
						renderAddendumFields={base => (
							<>
								<SmsOperatorRevenueCard base={`${base}.operatorRevenue`} />

								{isPartners
									? (
										<>
											<ContractTypeSection title={t("contract.sms.governmentShare")} name={`${base}.governmentRevenue` as any} />
											<ContractTypeSection
												title={t("contract.sms.feeAndShare")}
												name={`${base}.profit.pricing` as any}
												topAside={renderMinProfitField(`${base}.profit.minProfit`)}
											/>
										</>
									)
									: null}

								{isGovOps
									? (
										<ContractTypeSection title={t("contract.sms.governmentShare")} name={`${base}.governmentRate` as any} />
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
