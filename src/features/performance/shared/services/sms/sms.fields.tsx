import type { PerformanceFormValues } from "../../model/performance.form.types";
import {
	ContractAlignedField,
	useContractAlignedLabelWidth,
} from "#src/features/contract/shared/ui/form/components/ContractAlignedField";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { Card } from "antd";
import { useTranslation } from "react-i18next";
import "#src/features/contract/shared/ui/form/contract-form.css";

const sf = (path: string) => `serviceFields.${path}` as const;
const SMS_LABELS = ["مقدار عملکرد پیامک"];

export function SmsPerformanceFields() {
	const { t } = useTranslation();
	const alignedLabelStyle = useContractAlignedLabelWidth(SMS_LABELS);

	return (
		<Card variant="outlined" className="rounded-lg">
			<div
				className="contract-form-aligned-grid contract-form-aligned-grid--two"
				style={{ gap: 12, ...alignedLabelStyle }}
			>
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
			</div>
		</Card>
	);
}
