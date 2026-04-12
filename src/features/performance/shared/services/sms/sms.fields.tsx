import type { PerformanceFormValues } from "../../model/performance.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useTranslation } from "react-i18next";

const sf = (path: string) => `serviceFields.${path}` as const;

export function SmsPerformanceFields() {
	const { t } = useTranslation();

	return (
		<ProCard bordered headerBordered style={{ borderRadius: 8 }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
					gap: 12,
				}}
			>
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
			</div>
		</ProCard>
	);
}
