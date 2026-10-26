import type { PerformanceFormValues } from "../../model/performance.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";

interface TrafficMetricFieldProps {
	/** مسیر کامل فیلد در فرم (مثلاً `serviceFields.tehranValue`) */
	name: string
	label: string
	placeholder?: string
	decimal?: boolean
}

export function TrafficMetricField({ name, label, placeholder, decimal }: TrafficMetricFieldProps) {
	const inputId = `performance-traffic-${name}`;

	return (
		<div className="performance-traffic-location__field">
			<label className="performance-traffic-location__label" htmlFor={inputId}>{label}</label>
			<RHFProNumber<PerformanceFormValues, any>
				name={name as any}
				label=""
				inputProps={{
					"id": inputId,
					"placeholder": placeholder,
					"aria-label": label,
				}}
				formItemProps={{ className: "mb-0" }}
				decimal={decimal}
				enableGrouping={!decimal}
				enableWordsTooltip={!decimal}
			/>
		</div>
	);
}
