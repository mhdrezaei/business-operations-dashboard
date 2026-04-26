import type { PerformanceFormValues } from "../../model/performance.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";

const sf = (path: string) => `serviceFields.${path}` as const;

export function ShahkarPerformanceFields() {
	const { t } = useTranslation();

	return (
		<ProCard bordered headerBordered className="rounded-lg">
			<RHFProNumber<PerformanceFormValues, any>
				name={sf("performanceValue") as any}
				label={t("performance.fields.shahkar.performanceValue")}
				inputProps={{ placeholder: t("performance.placeholders.shahkarValue") }}
				enableGrouping
				enableWordsTooltip
			/>
		</ProCard>
	);
}
