import type { PerformanceFormValues } from "../../model/performance.form.types";
import { FieldCard } from "#src/shared/ui/dashed-card";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { useTranslation } from "react-i18next";

const sf = (path: string) => `serviceFields.${path}` as const;

export function PspPerformanceFields() {
	const { t } = useTranslation();

	return (
		<div className="performance-field-grid">
			<FieldCard title={t("performance.fields.psp.performanceValue")}>
				<RHFProNumber<PerformanceFormValues, any>
					name={sf("performanceValue") as any}
					label=""
					inputProps={{
						"placeholder": t("performance.placeholders.pspValue"),
						"aria-label": t("performance.fields.psp.performanceValue"),
					}}
					formItemProps={{ className: "mb-0" }}
					enableGrouping
					enableWordsTooltip
				/>
			</FieldCard>

			<FieldCard title={t("performance.fields.psp.monthlyRevenue")}>
				<RHFProNumber<PerformanceFormValues, any>
					name={sf("monthlyRevenue") as any}
					label=""
					inputProps={{
						"placeholder": t("performance.placeholders.example10000000"),
						"aria-label": t("performance.fields.psp.monthlyRevenue"),
						"addonAfter": t("performance.columns.rial"),
					}}
					formItemProps={{ className: "contract-type-currency-field mb-0" }}
					enableGrouping
					enableWordsTooltip
				/>
			</FieldCard>
		</div>
	);
}
