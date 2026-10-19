import type { KpiMonthlyRow } from "#src/features/dashboard/api/dashboard.dto";
import { formatPercent, formatRial } from "#src/features/dashboard/model/format";
import { jalaliMonthLabel, shPeriodKey } from "#src/features/dashboard/model/jalali";
import { TABLE, TABLE_WRAP, TBODY_ROW, TD, TH, THEAD_ROW } from "#src/features/dashboard/ui/modal/list-parts";
import { useTranslation } from "react-i18next";

import { GrowthBadge } from "./GrowthBadge";

const HEADERS = ["income", "expense", "profit", "profitMargin", "growthIncome", "growthExpense", "growthProfit"] as const;

/** "Monthly trend" view: one row per month with month-over-month growth. */
export function MonthlyTable({ monthly }: { monthly: KpiMonthlyRow[] }) {
	const { t } = useTranslation();
	return (
		<div className={TABLE_WRAP}>
			<table className={TABLE}>
				<thead>
					<tr className={THEAD_ROW}>
						<th className={TH}>{t("dashboard.common.month")}</th>
						{HEADERS.map(h => <th key={h} className={TH}>{t(`dashboard.widgets.monthlyKpis.columns.${h}`)}</th>)}
					</tr>
				</thead>
				<tbody>
					{monthly.map((m, i) => (
						<tr key={shPeriodKey(m.sh_year, m.sh_month)} className={`${TBODY_ROW} dash-fade-slide-up`} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
							<td className={`${TD} font-medium whitespace-nowrap`}>{jalaliMonthLabel(m.sh_year, m.sh_month)}</td>
							<td className={`${TD} whitespace-nowrap`}>{formatRial(m.income)}</td>
							<td className={`${TD} whitespace-nowrap !text-colorTextSecondary`}>{formatRial(m.expense)}</td>
							<td className={`${TD} whitespace-nowrap`}>{formatRial(m.profit)}</td>
							<td className={`${TD} whitespace-nowrap`}>{formatPercent(m.profit_margin)}</td>
							<td className={TD}><GrowthBadge value={m.mom_growth.income} /></td>
							<td className={TD}><GrowthBadge value={m.mom_growth.expense} inverse /></td>
							<td className={TD}><GrowthBadge value={m.mom_growth.profit} /></td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
