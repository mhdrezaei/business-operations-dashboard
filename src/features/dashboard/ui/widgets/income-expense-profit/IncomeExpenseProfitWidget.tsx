import type { CompanyFinancialsPeriod } from "#src/features/dashboard/api/dashboard.dto";
import type { DashboardWidgetProps } from "#src/features/dashboard/model/types";
import type { IncomeExpenseSource } from "./SourcePanel";
import { DEFAULT_FINANCIAL_RANGE, FINANCIAL_RANGES } from "#src/features/dashboard/model/financial";
import { RiWallet3Line } from "#src/features/dashboard/ui/icons";
import { WidgetCardShell } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { Segmented } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SourcePanel } from "./SourcePanel";

// Actual on the right, prediction on the left (RTL).
const SOURCES: IncomeExpenseSource[] = ["actual", "prediction"];

export function IncomeExpenseProfitWidget({ title, serviceIds }: DashboardWidgetProps) {
	const { t } = useTranslation();
	const [range, setRange] = useState<CompanyFinancialsPeriod>(DEFAULT_FINANCIAL_RANGE);

	return (
		<WidgetCardShell
			fill
			animateSize
			icon={<RiWallet3Line className="text-primaryText" />}
			title={title}
			description={t("dashboard.widgets.incomeExpense.description", { range: t(`dashboard.widgets.incomeExpense.rangePhrases.${range}`) })}
			headerExtra={(
				<Segmented<CompanyFinancialsPeriod>
					size="small"
					value={range}
					onChange={setRange}
					options={FINANCIAL_RANGES.map(id => ({ value: id, label: t(`dashboard.ranges.${id}`) }))}
				/>
			)}
		>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
				{SOURCES.map(source => (
					<SourcePanel key={source} source={source} name={t(`dashboard.widgets.incomeExpense.sources.${source}`)} serviceIds={serviceIds} range={range} />
				))}
			</div>
		</WidgetCardShell>
	);
}
