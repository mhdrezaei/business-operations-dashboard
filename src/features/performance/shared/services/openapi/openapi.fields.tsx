import type { PerformanceFormValues } from "../../model/performance.form.types";
import { FieldCard } from "#src/shared/ui/dashed-card";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { Tag } from "antd";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

const sf = (path: string) => `serviceFields.${path}` as const;

interface MetricNumberCardProps {
	name: string
	label: string
	placeholder: string
	currencyLabel?: string
}

const OPENAPI_SMS_FIELDS = [
	{ key: "irancellFa", label: "ایرانسل - فارسی" },
	{ key: "irancellEn", label: "ایرانسل - انگلیسی" },
	{ key: "mciFa", label: "همراه اول - فارسی" },
	{ key: "mciEn", label: "همراه اول - انگلیسی" },
	{ key: "otherFa", label: "سایر - فارسی" },
	{ key: "otherEn", label: "سایر - انگلیسی" },
] as const;

function MetricNumberCard({ name, label, placeholder, currencyLabel }: MetricNumberCardProps) {
	return (
		<FieldCard title={label}>
			<RHFProNumber<PerformanceFormValues, any>
				name={sf(name) as any}
				label=""
				inputProps={{
					"placeholder": placeholder,
					"aria-label": label,
					...(currencyLabel ? { addonAfter: currencyLabel } : {}),
				}}
				formItemProps={{ className: currencyLabel ? "contract-type-currency-field mb-0" : "mb-0" }}
				enableGrouping
				enableWordsTooltip
			/>
		</FieldCard>
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
			<FieldCard title={t("performance.labels.openapiContractModel")}>
				<p className="dashed-card__hint m-0">
					{t("performance.messages.noActiveContractForMonth")}
				</p>
			</FieldCard>
		);
	}

	return (
		<div className="performance-field-group">
			<div className="performance-field-group__header">
				<div className="flex items-center gap-2">
					<span>{t("performance.labels.openapiContractModel")}</span>
					<Tag color="purple" bordered={false}>{modelLabel}</Tag>
				</div>
			</div>

			<div className="performance-field-grid">
				<MetricNumberCard
					name="billInquiryValue"
					label={t("performance.fields.openapi.billInquiryValue")}
					placeholder={t("performance.placeholders.example60000")}
				/>

				{contractModel === "legacy"
					? (
						<MetricNumberCard
							name="receiptRegisterValue"
							label={t("performance.fields.openapi.receiptRegisterValue")}
							placeholder={t("performance.placeholders.example80000")}
						/>
					)
					: null}

				{contractModel === "package"
					? (
						<>
							<MetricNumberCard
								name="trafficRevenue"
								label={t("performance.fields.openapi.trafficRevenue")}
								placeholder={t("performance.placeholders.example120000000")}
								currencyLabel={t("performance.columns.rial")}
							/>
							<MetricNumberCard
								name="trafficPackageCount"
								label={t("performance.fields.openapi.trafficPackageCount")}
								placeholder={t("performance.placeholders.example450")}
							/>
							{OPENAPI_SMS_FIELDS.map(field => (
								<MetricNumberCard
									key={field.key}
									name={field.key}
									label={field.label}
									placeholder={t("performance.placeholders.example100000")}
								/>
							))}
						</>
					)
					: null}
			</div>
		</div>
	);
}
