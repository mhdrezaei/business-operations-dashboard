import type { PerformanceFormValues } from "../../model/performance.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { Card } from "antd";
import { useTranslation } from "react-i18next";

const sf = (path: string) => `serviceFields.${path}` as const;

export function PspPerformanceFields() {
	const { t } = useTranslation();

	return (
		<Card bordered className="rounded-lg">
			<div
				className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3"
			>
				<RHFProNumber<PerformanceFormValues, any>
					name={sf("performanceValue") as any}
					label={t("performance.fields.psp.performanceValue")}
					inputProps={{ placeholder: t("performance.placeholders.pspValue") }}
					enableGrouping
					enableWordsTooltip
				/>

				<RHFProNumber<PerformanceFormValues, any>
					name={sf("monthlyRevenue") as any}
					label={t("performance.fields.psp.monthlyRevenue")}
					inputProps={{ placeholder: t("performance.placeholders.example10000000") }}
					enableGrouping
					enableWordsTooltip
				/>
			</div>
		</Card>
	);
}
