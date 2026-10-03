import { DashedBorder } from "#src/shared/ui/dashed-border";
import "./report-summary-cards.css";

export interface ReportSummaryItem {
	key: string
	label: string
	value: string
}

interface ReportSummaryCardsProps {
	items: ReportSummaryItem[]
}

export function ReportSummaryCards({ items }: ReportSummaryCardsProps) {
	if (items.length === 0)
		return null;

	return (
		<div className="report-summary-cards" role="list" aria-label="جمع کل گزارش">
			{items.map(item => (
				<div key={item.key} className="report-summary-cards__item" role="listitem">
					<DashedBorder />
					<div className="report-summary-cards__content">
						<span className="report-summary-cards__label">{item.label}</span>
						<span className="report-summary-cards__value">{item.value}</span>
					</div>
				</div>
			))}
		</div>
	);
}
