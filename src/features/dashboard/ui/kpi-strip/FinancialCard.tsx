import type { CompanyFinancialsPeriod, FinancialComparison, FinancialMetric, FinancialSummaryResponse } from "#src/features/dashboard/api/dashboard.dto";
import type { KpiTone } from "./kpi-tones";
import type { PhIconName } from "./PhIcon";
import { formatNumber, formatRial, toNum } from "#src/features/dashboard/model/format";
import { periodRangeText } from "#src/features/dashboard/model/jalali";
import { requestMonthlyMetric } from "#src/features/dashboard/model/navigation";
import { useTranslation } from "react-i18next";

import { enterStyle, HOVER_LIFT, roll, settle, useSampled } from "./kpi-motion";
import { CardLink } from "./kpi-parts";
import { useKpiTones } from "./kpi-tones";
import { PhIcon } from "./PhIcon";

export interface FinancialDef {
	key: FinancialMetric
	icon: PhIconName
	tone: KpiTone
	/** Growth is bad (expense). */
	inverse?: boolean
}

/** Anchor of the monthly chart the income/expense/profit cards jump to. */
const MONTHLY_ANCHOR = "monthly-performance";

const pf = (n: number) => formatNumber(n, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const p1 = (n: number) => formatNumber(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

interface Delta {
	label: string
	g: number | null
	title?: string
}

interface FinancialCardProps {
	def: FinancialDef
	data: FinancialSummaryResponse | null | undefined
	range: CompanyFinancialsPeriod
	rangeNoun: string
	p: number
	shown: boolean
	index: number
	pending: boolean
}

export function FinancialCard({ def, data, range, rangeNoun, p, shown, index, pending }: FinancialCardProps) {
	const { t } = useTranslation();
	const tones = useKpiTones();
	const pn = useSampled(p);
	const value = toNum(data?.totals?.[def.key]);
	const hasActual = value !== null;
	// prediction === null: the user may not see predictions → the forecast/realization part is hidden.
	const showForecast = data?.prediction != null;
	const forecast = showForecast ? toNum(data.prediction?.[def.key]) : null;
	const hasForecast = forecast !== null;
	// realization is a percent (2224 = 22.2 times); null (zero prediction) → "—".
	const realization = showForecast ? toNum(data?.realization?.[def.key]) : null;
	const ratio = realization === null ? null : realization / 100;
	const good = ratio === null ? false : def.inverse ? ratio <= 1 : ratio >= 1;
	const ratioColor = ratio === null ? tones.faint : good ? tones.ok.color : def.inverse ? tones.danger.color : tones.warn.color;
	const over = ratio !== null && ratio > 1.5;
	const { color, soft } = tones[def.tone];

	// Ready growth percent from the backend; reversed for expense (growth = bad). null → "—" without color.
	const deltaColor = (g: number | null) => {
		if (g === null || g === 0)
			return tones.faint;
		return (def.inverse ? g < 0 : g > 0) ? tones.ok.color : tones.danger.color;
	};

	// "Compared to …" chips. In fiscal_ytd the previous range and the previous year are the same (previous fiscal
	// year), so only one chip is built.
	const one = (src: FinancialComparison | undefined, label: string): Delta | null => src
		? {
			label,
			g: toNum(src.growth?.[def.key]),
			title: toNum(src[def.key]) !== null ? t("dashboard.kpi.financial.deltaTitle", { label, amount: formatRial(src[def.key]) }) : undefined,
		}
		: null;
	const prev = data?.previous_period;
	const yoy = data?.year_over_year;
	const deltas = (range === "fiscal_ytd"
		? [one(prev || yoy, t("dashboard.kpi.financial.previousFiscalYear"))]
		: [
			one(prev, periodRangeText(prev) || t("dashboard.kpi.financial.previousPeriod")),
			one(yoy, periodRangeText(yoy) || t("dashboard.kpi.financial.previousYear")),
		]).filter((d): d is Delta => d !== null);

	return (
		<div className="flex" style={enterStyle(shown, (index + 1) * 80)}>
			<CardLink
				anchor={MONTHLY_ANCHOR}
				onActivate={() => requestMonthlyMetric(def.key)}
				className={`relative flex-1 min-w-0 flex flex-col items-center gap-3.5 px-5 pt-[22px] pb-[18px] rounded-xl bg-colorFillQuaternary border border-solid border-[var(--dash-border)] text-colorText text-center overflow-hidden cursor-pointer ${HOVER_LIFT} hover:-translate-y-[3px] hover:bg-colorFillTertiary hover:border-primary hover:shadow-lg active:-translate-y-px`}
			>
				<span
					aria-hidden="true"
					className="absolute top-0 inset-x-0 h-0.5"
					style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
				/>
				<span className="flex flex-col items-center gap-2">
					<span className="grid place-items-center w-11 h-11 rounded-xl text-2xl" style={{ background: soft, color, boxShadow: `inset 0 0 0 1px ${soft}` }}>
						<PhIcon name={def.icon} />
					</span>
					<span className="text-[13.5px] font-medium text-colorTextSecondary">
						{t("dashboard.kpi.financial.cardLabel", { metric: t(`dashboard.metrics.${def.key}`), range: rangeNoun })}
					</span>
				</span>
				<span className="flex flex-col items-center leading-[1.25]">
					<strong className="text-[32px] font-semibold tabular-nums whitespace-nowrap">{pending ? roll(10) : hasActual ? settle(value, pn) : "—"}</strong>
					<span className="text-[12.5px] text-colorTextTertiary">{hasActual ? t("dashboard.common.rialUnit") : t("dashboard.kpi.financial.noData")}</span>
				</span>
				{hasActual && (
					<>
						{showForecast && (
							<>
								<span className="grid grid-cols-[1fr_1px_1fr] gap-3.5 w-full pt-3.5 border-0 border-t border-solid border-colorFillSecondary">
									<span className="flex flex-col gap-0.5">
										<span className="text-[11.5px] text-colorTextTertiary">{t("dashboard.kpi.financial.forecast")}</span>
										<span className="text-[13.5px] text-colorTextSecondary whitespace-nowrap tabular-nums">{pending ? roll(10) : hasForecast ? settle(forecast, pn) : "—"}</span>
									</span>
									<span className="bg-colorFillSecondary" />
									<span className="flex flex-col gap-0.5">
										<span className="text-[11.5px] text-colorTextTertiary">{over ? t("dashboard.kpi.financial.vsForecast") : t("dashboard.kpi.financial.realization")}</span>
										<span className="text-[13.5px] font-semibold" style={{ color: ratioColor }}>
											<span>
												{pending
													? `${roll(2)}٪`
													: ratio === null
														? "—"
														: over ? t("dashboard.kpi.financial.times", { value: p1(ratio * pn) }) : `${p1(ratio * 100 * pn)}٪`}
											</span>
										</span>
									</span>
								</span>
								<span className="block w-full h-1.5 rounded-full bg-colorFillSecondary overflow-hidden">
									<span className="block h-full rounded-full" style={{ width: `${ratio === null ? 0 : Math.min(100, ratio * 100) * p}%`, background: ratioColor }} />
								</span>
							</>
						)}
						<span className="flex flex-wrap justify-center gap-2 text-[12px]">
							{deltas.map(d => (
								<span key={d.label} title={d.title} className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-[3px] rounded-full bg-colorBgContainer border border-solid border-[var(--dash-border)] text-colorTextTertiary">
									{t("dashboard.kpi.financial.compareTo", { label: d.label })}
									<b dir="ltr" className="font-semibold" style={{ color: deltaColor(d.g) }}>
										{pending ? `${roll(2)}٪` : d.g === null ? "—" : `${d.g >= 0 ? "▲" : "▼"} ${pf(Math.abs(d.g) * pn)}٪`}
									</b>
								</span>
							))}
						</span>
					</>
				)}
			</CardLink>
		</div>
	);
}
