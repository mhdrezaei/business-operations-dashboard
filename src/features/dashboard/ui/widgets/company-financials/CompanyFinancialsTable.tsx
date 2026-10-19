import type { CompanyFinancialsResponse, CompanyFinancialsRow, FinancialMetric, SortOrder } from "#src/features/dashboard/api/dashboard.dto";
import type { ChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import { companyTypeLabel } from "#src/features/dashboard/model/company-type";
import { FINANCIAL_METRICS } from "#src/features/dashboard/model/financial";
import { formatCount, formatPercent, toNum } from "#src/features/dashboard/model/format";
import { SortableTh, TABLE, TABLE_WRAP, TBODY_ROW, TD, TH, THEAD_ROW } from "#src/features/dashboard/ui/modal/list-parts";
import { useTranslation } from "react-i18next";
import { isNegative, metricColor, moneyText, rowKey } from "./company-financials.model";

interface MoneyCellProps {
	amount: unknown
	share: unknown
	barColor: string
	/** Visual scale of the bar under the amount (largest value of this page); no number is derived from it. */
	scale: number
	T: ChartTheme
}

function MoneyCell({ amount, share, barColor, scale, T }: MoneyCellProps) {
	const { t } = useTranslation();
	const n = toNum(amount) ?? 0;
	const neg = n < 0;
	return (
		<td className={`${TD} whitespace-nowrap tabular-nums`}>
			<div className="flex flex-col items-end gap-1">
				<div className="flex items-baseline gap-2" dir="ltr">
					<span className="text-[11px] text-colorTextTertiary" title={t("dashboard.widgets.companyFinancials.shareOfTotal")}>
						{formatPercent(share)}
					</span>
					<span className={`text-[13px] font-semibold ${neg ? "text-error" : ""}`}>{moneyText(amount)}</span>
				</div>
				<span className="flex justify-end w-full max-w-[150px] h-[3px] rounded-full bg-colorFillTertiary">
					<span
						className="block h-full rounded-full transition-[width] duration-500"
						style={{ width: `${scale > 0 ? Math.min(100, (Math.abs(n) / scale) * 100) : 0}%`, background: neg ? T.danger : barColor }}
					/>
				</span>
			</div>
		</td>
	);
}

interface CompanyFinancialsTableProps {
	data: CompanyFinancialsResponse
	rows: CompanyFinancialsRow[]
	period: string
	/** Remount key of the rows: bumps with every response so the entrance animation replays. */
	gen: number
	colorOf: Record<string, string>
	serverSortBy: FinancialMetric | null
	serverOrder: SortOrder
	totals: CompanyFinancialsResponse["totals"][string] | undefined
	T: ChartTheme
	onSort: (metric: FinancialMetric) => void
	setHover: (key: string | null) => void
}

export function CompanyFinancialsTable({ data, rows, period, gen, colorOf, serverSortBy, serverOrder, totals, T, onSort, setHover }: CompanyFinancialsTableProps) {
	const { t } = useTranslation();
	const barScale = Object.fromEntries(
		FINANCIAL_METRICS.map(m => [m, Math.max(0, ...rows.map(r => Math.abs(toNum(r.periods?.[period]?.[m]) ?? 0)))]),
	);
	return (
		<div className={`${TABLE_WRAP} lg:overflow-clip lg:[overflow-clip-margin:24px]`} onMouseLeave={() => setHover(null)}>
			{/* The hovered row scales without background/shadow so nothing falls over its neighbours; extra padding on the first/last cell + (lg) overflow-clip with a margin keep the scaled edges uncut and prevent horizontal scroll. */}
			<table className={`${TABLE} min-w-[800px] [&_tr>:first-child]:ps-5 [&_tr>:last-child]:pe-5`}>
				<thead>
					<tr className={THEAD_ROW}>
						<th className={TH}>{t("dashboard.columns.company")}</th>
						<th className={TH}>{t("dashboard.columns.companyType")}</th>
						{FINANCIAL_METRICS.map(m => (
							<SortableTh
								className="text-end"
								key={m}
								label={t("dashboard.widgets.companyFinancials.columnRial", { label: t(`dashboard.metrics.${m}`) })}
								active={serverSortBy === m}
								order={serverOrder}
								onClick={() => onSort(m)}
							/>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((r, i) => {
						const cur = r.periods?.[period];
						const key = rowKey(r);
						// Only top companies are hover-linked with the chart; "other" companies stand alone.
						const hid = colorOf[key] ? key : null;
						return (
							<tr
								key={`${gen}-${key}`}
								onMouseEnter={() => setHover(hid)}
								className={`${TBODY_ROW} dash-rise-in relative [text-rendering:geometricPrecision] will-change-transform hover:!bg-transparent hover:z-10 hover:scale-[1.025] motion-reduce:hover:scale-100`}
								style={{
									animationDelay: `${i * 40}ms`,
									animationFillMode: "backwards", // with `both` the final transform of the animation would block the hover scale
									transition: "transform .2s ease-out",
								}}
							>
								<td className={TD}>
									<span className="flex items-center gap-2.5 min-w-0">
										<span className="w-1 h-[30px] rounded-sm shrink-0" style={{ background: colorOf[key] ?? T.faint }} />
										<span className="flex flex-col min-w-0 leading-[1.4]">
											<span className="text-[13px] font-medium [overflow-wrap:anywhere]">{r.company_name || "—"}</span>
											<span className="text-[11.5px] text-colorTextTertiary">{r.service_name || "—"}</span>
										</span>
									</span>
								</td>
								<td className={`${TD} whitespace-nowrap`}>
									{r.company_type
										? (
											<span className="inline-block px-2.5 py-px rounded-full text-[11.5px] bg-colorFillQuaternary border border-solid border-[var(--dash-border)] text-colorTextSecondary">
												{companyTypeLabel(r.service_code, r.company_type)}
											</span>
										)
										: null}
								</td>
								{FINANCIAL_METRICS.map(m => (
									<MoneyCell key={m} amount={cur?.[m]} share={cur?.[`${m}_share`]} barColor={metricColor(T, m)} scale={barScale[m]} T={T} />
								))}
							</tr>
						);
					})}
				</tbody>
				{totals && (
					<tfoot>
						<tr className="bg-colorFillQuaternary text-[13px]">
							<td className={`${TD} font-semibold`}>
								{t("dashboard.widgets.companyFinancials.total")}
								{" "}
								<span className="text-[12px] font-normal text-colorTextTertiary">{t("dashboard.widgets.companyFinancials.companiesCount", { n: formatCount(data.count) })}</span>
							</td>
							<td className={TD} />
							{FINANCIAL_METRICS.map(m => (
								<td key={m} className={`${TD} text-start font-semibold tabular-nums whitespace-nowrap ${isNegative(totals[m]) ? "text-error" : ""}`} dir="ltr">
									{moneyText(totals[m])}
								</td>
							))}
						</tr>
					</tfoot>
				)}
			</table>
		</div>
	);
}
