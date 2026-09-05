import type { PerformanceFormValues } from "../../model/performance.form.types";
import { PerformanceFieldCard } from "#src/features/performance/shared/ui/form/components/PerformanceFieldCard";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { useTranslation } from "react-i18next";

const sf = (path: string) => `serviceFields.${path}` as const;

const SMS_PERFORMANCE_FIELDS = [
	{ key: "irancellFa", label: "ایرانسل - فارسی", tone: "gold" },
	{ key: "irancellEn", label: "ایرانسل - انگلیسی", tone: "gold" },
	{ key: "mciFa", label: "همراه اول - فارسی", tone: "blue" },
	{ key: "mciEn", label: "همراه اول - انگلیسی", tone: "blue" },
	{ key: "otherFa", label: "سایر - فارسی", tone: "geekblue" },
	{ key: "otherEn", label: "سایر - انگلیسی", tone: "geekblue" },
] as const;

export function SmsPerformanceFields() {
	const { t } = useTranslation();

	return (
		<div className="performance-field-grid">
			{SMS_PERFORMANCE_FIELDS.map(field => (
				<PerformanceFieldCard key={field.key} title={field.label} tone={field.tone}>
					<RHFProNumber<PerformanceFormValues, any>
						name={sf(field.key) as any}
						label=""
						inputProps={{
							"placeholder": t("performance.placeholders.example100000"),
							"aria-label": `${t("performance.labels.performanceValue")} ${field.label}`,
						}}
						formItemProps={{ className: "mb-0" }}
						enableGrouping
						enableWordsTooltip
					/>
				</PerformanceFieldCard>
			))}
		</div>
	);
}
