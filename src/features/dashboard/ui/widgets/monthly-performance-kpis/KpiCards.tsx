import type { KpiComparison, MonthlyPerformanceKpisResponse, NullableGrowth } from "#src/features/dashboard/api/dashboard.dto";
import { formatPercent, formatRial } from "#src/features/dashboard/model/format";
import { useTranslation } from "react-i18next";

import { GrowthBadge } from "./GrowthBadge";
import { periodsLabel } from "./periods-label";

interface KpiCardProps {
	label: string
	value: string
	growth?: keyof NullableGrowth
	inverse?: boolean
	previous?: KpiComparison
	yoy?: KpiComparison
	sub?: string
	index: number
}

function KpiCard({ label, value, growth, inverse, previous, yoy, sub, index }: KpiCardProps) {
	const { t } = useTranslation();
	const prevLabel = periodsLabel(previous?.periods);
	const yoyLabel = periodsLabel(yoy?.periods);
	const yoyValue = formatPercent(growth && yoy ? yoy.growth[growth] : null);
	const yoyTitle = yoy
		? (yoyLabel ? t("dashboard.widgets.monthlyKpis.yoyPeriod", { period: yoyLabel, value: yoyValue }) : t("dashboard.widgets.monthlyKpis.yoy", { value: yoyValue }))
		: undefined;
	return (
		<div className="flex dash-fade-slide-up" style={{ animationDelay: `${index * 70}ms` }}>
			<div className="flex-1 min-w-0 flex flex-col gap-1.5 px-3.5 py-3 rounded-xl bg-colorFillQuaternary border border-solid border-colorBorder cursor-default transition-[transform,border-color,box-shadow,background-color] duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[3px] hover:border-primary hover:bg-colorFillTertiary hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
				<span className="text-[12px] text-colorTextTertiary">{label}</span>
				<span className="text-[17px] font-semibold text-colorText">{value}</span>
				{growth
					? (
						<span className="flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-colorTextTertiary" title={yoyTitle}>
							<GrowthBadge value={previous?.growth[growth]} inverse={inverse} />
							{prevLabel && <span>{t("dashboard.widgets.monthlyKpis.vsPrevious", { value: prevLabel })}</span>}
						</span>
					)
					: sub && <span className="text-[11.5px] text-colorTextTertiary">{sub}</span>}
			</div>
		</div>
	);
}

/** Income / expense / profit with growth vs the previous period, and the profit margin. */
export function KpiCards({ totals }: { totals: MonthlyPerformanceKpisResponse["totals"] }) {
	const { t } = useTranslation();
	return (
		<div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
			<KpiCard label={t("dashboard.widgets.monthlyKpis.columns.income")} index={0} value={formatRial(totals.income)} growth="income" previous={totals.previous_period} yoy={totals.year_over_year} />
			<KpiCard label={t("dashboard.widgets.monthlyKpis.columns.expense")} index={1} value={formatRial(totals.expense)} growth="expense" inverse previous={totals.previous_period} yoy={totals.year_over_year} />
			<KpiCard label={t("dashboard.widgets.monthlyKpis.columns.profit")} index={2} value={formatRial(totals.profit)} growth="profit" previous={totals.previous_period} yoy={totals.year_over_year} />
			<KpiCard
				label={t("dashboard.widgets.monthlyKpis.columns.profitMargin")}
				index={3}
				value={formatPercent(totals.profit_margin)}
				sub={t("dashboard.widgets.monthlyKpis.expenseRatio", { value: formatPercent(totals.expense_ratio) })}
			/>
		</div>
	);
}
