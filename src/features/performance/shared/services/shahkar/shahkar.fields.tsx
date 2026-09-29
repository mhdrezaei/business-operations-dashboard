import type { PerformanceFormValues } from "../../model/performance.form.types";
import { FieldCard } from "#src/shared/ui/dashed-card";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { useTranslation } from "react-i18next";

const sf = (path: string) => `serviceFields.${path}` as const;

export function ShahkarPerformanceFields() {
	const { t } = useTranslation();

	return (
		<div className="performance-field-grid">
			<FieldCard title={t("performance.fields.shahkar.performanceValue")}>
				<RHFProNumber<PerformanceFormValues, any>
					name={sf("performanceValue") as any}
					label=""
					inputProps={{
						"placeholder": t("performance.placeholders.shahkarValue"),
						"aria-label": t("performance.fields.shahkar.performanceValue"),
					}}
					formItemProps={{ className: "mb-0" }}
					enableGrouping
					enableWordsTooltip
				/>
			</FieldCard>
		</div>
	);
}
