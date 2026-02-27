import type { PerformanceFormValues } from "../../model/performance.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";

const sf = (path: string) => `serviceFields.${path}` as const;

export function SmsPerformanceFields() {
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
					label="مقدار عملکرد ایرانسل - فارسی"
					inputProps={{ placeholder: "مثلاً 100000" }}
					enableGrouping
					enableWordsTooltip
				/>
				<RHFProNumber<PerformanceFormValues, any>
					name={sf("irancellEn") as any}
					label="مقدار عملکرد ایرانسل - انگلیسی"
					inputProps={{ placeholder: "مثلاً 100000" }}
					enableGrouping
					enableWordsTooltip
				/>
				<RHFProNumber<PerformanceFormValues, any>
					name={sf("mciFa") as any}
					label="مقدار عملکرد همراه اول - فارسی"
					inputProps={{ placeholder: "مثلاً 100000" }}
					enableGrouping
					enableWordsTooltip
				/>
				<RHFProNumber<PerformanceFormValues, any>
					name={sf("mciEn") as any}
					label="مقدار عملکرد همراه اول - انگلیسی"
					inputProps={{ placeholder: "مثلاً 100000" }}
					enableGrouping
					enableWordsTooltip
				/>
				<RHFProNumber<PerformanceFormValues, any>
					name={sf("otherFa") as any}
					label="مقدار عملکرد سایر - فارسی"
					inputProps={{ placeholder: "مثلاً 100000" }}
					enableGrouping
					enableWordsTooltip
				/>
				<RHFProNumber<PerformanceFormValues, any>
					name={sf("otherEn") as any}
					label="مقدار عملکرد سایر - انگلیسی"
					inputProps={{ placeholder: "مثلاً 100000" }}
					enableGrouping
					enableWordsTooltip
				/>
			</div>
		</ProCard>
	);
}
