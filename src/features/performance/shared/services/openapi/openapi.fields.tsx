import type { PerformanceFormValues } from "../../model/performance.form.types";
import {
	ContractAlignedField,
	useContractAlignedLabelWidth,
} from "#src/features/contract/shared/ui/form/components/ContractAlignedField";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { Card } from "antd";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import "#src/features/contract/shared/ui/form/contract-form.css";

const sf = (path: string) => `serviceFields.${path}` as const;

const OPENAPI_PACKAGE_LABELS = [
	"مقدار عملکرد استعلام قبض",
	"درآمد ترافیک",
	"تعداد بسته ترافیکی",
	"مقدار عملکرد پیامک",
];

function FieldGrid({ children }: { children: React.ReactNode }) {
	return (
		<div
			className="contract-form-aligned-grid contract-form-aligned-grid--two gap-3"

		>
			{children}
		</div>
	);
}

export function OpenApiPerformanceFields() {
	const { t } = useTranslation();
	const { control } = useFormContext<PerformanceFormValues>();
	const contractModel = useWatch({ control, name: "contractModel" });
	const alignedLabelStyle = useContractAlignedLabelWidth(OPENAPI_PACKAGE_LABELS);

	const modelLabel = useMemo(() => {
		if (contractModel === "legacy")
			return t("performance.contractModel.legacy");
		if (contractModel === "package")
			return t("performance.contractModel.package");
		return "-";
	}, [contractModel, t]);

	if (!contractModel) {
		return (
			<Card variant="outlined" className="rounded-lg">
				<div className="opacity-80">
					{t("performance.messages.noActiveContractForMonth")}
				</div>
			</Card>
		);
	}

	return (
		<Card
			bordered
			className="rounded-lg"
			title={(
				<div className="flex gap-2">
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
					<div style={alignedLabelStyle}>
						<FieldGrid>
							<ContractAlignedField label={t("performance.fields.openapi.billInquiryValue")}>
								<RHFProNumber<PerformanceFormValues, any>
									name={sf("billInquiryValue") as any}
									label=""
									inputProps={{ placeholder: t("performance.placeholders.example60000") }}
									enableGrouping
									enableWordsTooltip
								/>
							</ContractAlignedField>

							<ContractAlignedField label={t("performance.fields.openapi.trafficRevenue")}>
								<RHFProNumber<PerformanceFormValues, any>
									name={sf("trafficRevenue") as any}
									label=""
									inputProps={{ placeholder: t("performance.placeholders.example120000000") }}
									enableGrouping
									enableWordsTooltip
								/>
							</ContractAlignedField>

							<ContractAlignedField label={t("performance.fields.openapi.trafficPackageCount")}>
								<RHFProNumber<PerformanceFormValues, any>
									name={sf("trafficPackageCount") as any}
									label=""
									inputProps={{ placeholder: t("performance.placeholders.example450") }}
									enableGrouping
									enableWordsTooltip
								/>
							</ContractAlignedField>

							<ContractAlignedField label="مقدار عملکرد پیامک">
								<RHFProNumber<PerformanceFormValues, any>
									name={sf("irancellFa") as any}
									label=""
									inputProps={{
										placeholder: t("performance.placeholders.example100000"),
										addonAfter: "ایرانسل - فارسی",
									}}
									enableGrouping
									enableWordsTooltip
								/>
							</ContractAlignedField>

							<ContractAlignedField label="مقدار عملکرد پیامک">
								<RHFProNumber<PerformanceFormValues, any>
									name={sf("irancellEn") as any}
									label=""
									inputProps={{
										placeholder: t("performance.placeholders.example100000"),
										addonAfter: "ایرانسل - انگلیسی",
									}}
									enableGrouping
									enableWordsTooltip
								/>
							</ContractAlignedField>

							<ContractAlignedField label="مقدار عملکرد پیامک">
								<RHFProNumber<PerformanceFormValues, any>
									name={sf("mciFa") as any}
									label=""
									inputProps={{
										placeholder: t("performance.placeholders.example100000"),
										addonAfter: "همراه اول - فارسی",
									}}
									enableGrouping
									enableWordsTooltip
								/>
							</ContractAlignedField>

							<ContractAlignedField label="مقدار عملکرد پیامک">
								<RHFProNumber<PerformanceFormValues, any>
									name={sf("mciEn") as any}
									label=""
									inputProps={{
										placeholder: t("performance.placeholders.example100000"),
										addonAfter: "همراه اول - انگلیسی",
									}}
									enableGrouping
									enableWordsTooltip
								/>
							</ContractAlignedField>

							<ContractAlignedField label="مقدار عملکرد پیامک">
								<RHFProNumber<PerformanceFormValues, any>
									name={sf("otherFa") as any}
									label=""
									inputProps={{
										placeholder: t("performance.placeholders.example100000"),
										addonAfter: "سایر - فارسی",
									}}
									enableGrouping
									enableWordsTooltip
								/>
							</ContractAlignedField>

							<ContractAlignedField label="مقدار عملکرد پیامک">
								<RHFProNumber<PerformanceFormValues, any>
									name={sf("otherEn") as any}
									label=""
									inputProps={{
										placeholder: t("performance.placeholders.example100000"),
										addonAfter: "سایر - انگلیسی",
									}}
									enableGrouping
									enableWordsTooltip
								/>
							</ContractAlignedField>
						</FieldGrid>
					</div>
				)
				: null}
		</Card>
	);
}
