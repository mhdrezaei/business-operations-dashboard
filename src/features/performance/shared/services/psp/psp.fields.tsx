import type { PerformanceFormValues } from "../../model/performance.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";

const sf = (path: string) => `serviceFields.${path}` as const;

export function PspPerformanceFields() {
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
					name={sf("performanceValue") as any}
					label="مقدار عملکرد"
					inputProps={{ placeholder: "مثلاً تعداد تراکنش" }}
					enableGrouping
					enableWordsTooltip
				/>

				<RHFProNumber<PerformanceFormValues, any>
					name={sf("monthlyRevenue") as any}
					label="درآمد این ماه (تومان)"
					inputProps={{ placeholder: "مثلاً 10000000" }}
					enableGrouping
					enableWordsTooltip
				/>
			</div>
		</ProCard>
	);
}
