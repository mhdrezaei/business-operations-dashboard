import type { PerformanceFormValues } from "../../model/performance.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

const sf = (path: string) => `serviceFields.${path}` as const;

function FieldGrid({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
				gap: 12,
			}}
		>
			{children}
		</div>
	);
}

export function OpenApiPerformanceFields() {
	const { t } = useTranslation();
	const { control } = useFormContext<PerformanceFormValues>();
	const contractModel = useWatch({ control, name: "contractModel" });

	const modelLabel = useMemo(() => {
		if (contractModel === "legacy")
			return t("performance.contractModel.legacy");
		if (contractModel === "package")
			return t("performance.contractModel.package");
		return "-";
	}, [contractModel, t]);

	if (!contractModel) {
		return (
			<ProCard bordered headerBordered style={{ borderRadius: 8 }}>
				<div style={{ opacity: 0.8 }}>
					{t("performance.messages.noActiveContractForMonth")}
				</div>
			</ProCard>
		);
	}

	return (
		<ProCard
			bordered
			headerBordered
			style={{ borderRadius: 8 }}
			title={(
				<div style={{ display: "flex", gap: 8 }}>
					<span>{t("performance.labels.openapiContractModel")}</span>
					<strong>{modelLabel}</strong>
				</div>
			)}
		>
			{contractModel === "legacy"
				? (
					<FieldGrid>
						<RHFProNumber<PerformanceFormValues, any>
							name={sf("billInquiryValue") as any}
							label={t("performance.fields.openapi.billInquiryValue")}
							inputProps={{ placeholder: t("performance.placeholders.example60000") }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("receiptRegisterValue") as any}
							label={t("performance.fields.openapi.receiptRegisterValue")}
							inputProps={{ placeholder: t("performance.placeholders.example80000") }}
							enableGrouping
							enableWordsTooltip
						/>
					</FieldGrid>
				)
				: null}

			{contractModel === "package"
				? (
					<FieldGrid>
						<RHFProNumber<PerformanceFormValues, any>
							name={sf("billInquiryValue") as any}
							label={t("performance.fields.openapi.billInquiryValue")}
							inputProps={{ placeholder: t("performance.placeholders.example60000") }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("trafficRevenue") as any}
							label={t("performance.fields.openapi.trafficRevenue")}
							inputProps={{ placeholder: t("performance.placeholders.example120000000") }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("trafficPackageCount") as any}
							label={t("performance.fields.openapi.trafficPackageCount")}
							inputProps={{ placeholder: t("performance.placeholders.example450") }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("irancellFa") as any}
							label={t("performance.fields.sms.irancellFa")}
							inputProps={{ placeholder: t("performance.placeholders.example100000") }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("irancellEn") as any}
							label={t("performance.fields.sms.irancellEn")}
							inputProps={{ placeholder: t("performance.placeholders.example100000") }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("mciFa") as any}
							label={t("performance.fields.sms.mciFa")}
							inputProps={{ placeholder: t("performance.placeholders.example100000") }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("mciEn") as any}
							label={t("performance.fields.sms.mciEn")}
							inputProps={{ placeholder: t("performance.placeholders.example100000") }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("otherFa") as any}
							label={t("performance.fields.sms.otherFa")}
							inputProps={{ placeholder: t("performance.placeholders.example100000") }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("otherEn") as any}
							label={t("performance.fields.sms.otherEn")}
							inputProps={{ placeholder: t("performance.placeholders.example100000") }}
							enableGrouping
							enableWordsTooltip
						/>
					</FieldGrid>
				)
				: null}
		</ProCard>
	);
}
