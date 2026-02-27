import type { PerformanceFormValues } from "../../model/performance.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";

const sf = (path: string) => `serviceFields.${path}` as const;

export function ShahkarPerformanceFields() {
	return (
		<ProCard bordered headerBordered style={{ borderRadius: 8 }}>
			<RHFProNumber<PerformanceFormValues, any>
				name={sf("performanceValue") as any}
				label="مقدار عملکرد"
				inputProps={{ placeholder: "مثلاً 123.45" }}
				enableGrouping
				enableWordsTooltip
			/>
		</ProCard>
	);
}
