import type { PerformanceFormValues } from "../../model/performance.form.types";
import { FieldCard } from "#src/shared/ui/dashed-card";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

const sf = (path: string) => `serviceFields.${path}` as const;

export function ShahkarPerformanceFields() {
	const { t } = useTranslation();
	const { control } = useFormContext<PerformanceFormValues>();
	const hasNewCustomerRate = useWatch({ control, name: "serviceFields.hasNewCustomerRate" as any });

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
			{hasNewCustomerRate === true && (
				<FieldCard title={t("performance.fields.shahkar.newCustomerCount")}>
					<RHFProNumber<PerformanceFormValues, any>
						name={sf("newCustomerCount") as any}
						label=""
						decimal={false}
						inputProps={{
							"placeholder": t("performance.placeholders.shahkarNewCustomerCount"),
							"aria-label": t("performance.fields.shahkar.newCustomerCount"),
						}}
						formItemProps={{ className: "mb-0" }}
						enableGrouping
						enableWordsTooltip
					/>
				</FieldCard>
			)}
		</div>
	);
}
