import type { CompanyFinancialsPeriod } from "#src/features/dashboard/api/dashboard.dto";
import type { FinancialDef } from "./FinancialCard";
import { DEFAULT_FINANCIAL_RANGE, FINANCIAL_RANGES } from "#src/features/dashboard/model/financial";
import { periodRangeText } from "#src/features/dashboard/model/jalali";
import { serviceIdsParam } from "#src/features/dashboard/model/types";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { AutoHeight } from "#src/features/dashboard/ui/shell/AutoHeight";
import { WidgetNotice } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { FinancialCard } from "./FinancialCard";
import { enterStyle, useReveal, useRollTick } from "./kpi-motion";
import { PANEL, PanelHeader } from "./kpi-parts";

const FIN_DEFS: FinancialDef[] = [
	{ key: "income", icon: "hand-coins", tone: "ok" },
	{ key: "expense", icon: "receipt", tone: "danger", inverse: true },
	{ key: "profit", icon: "chart-line-up", tone: "link" },
];

/**
 * "Financial performance" panel: independent of the rest of the strip, everything comes from one financial-summary
 * request. A range or service-filter change refetches only that request; the digits roll until the response
 * arrives, then the count plays once.
 */
export function FinancialPanel({ serviceIds }: { serviceIds: number[] }) {
	const { t } = useTranslation();
	const [range, setRange] = useState<CompanyFinancialsPeriod>(DEFAULT_FINANCIAL_RANGE);
	// "All services" = without service_ids.
	const query = useQuery(widgetDataQuery("financial-summary", { range, service_ids: serviceIdsParam(serviceIds) }));
	const data = query.data;
	const loading = query.isPending || query.isPlaceholderData;
	const error = query.isError;

	const { p, shown } = useReveal(data, null, 1200, 0, false, loading);
	const rolling = loading || p < 0.3;
	useRollTick(rolling);

	// 404 (no access to the financial performance) → the panel is not shown at all.
	if (!loading && !error && data === null)
		return null;

	const rangeNoun = t(`dashboard.kpi.financial.rangeNouns.${range}`);
	const periodLabel = data ? periodRangeText(data.period) : null;
	const subjectLabel = range === "1m"
		? periodLabel
		: periodLabel ? t("dashboard.kpi.financial.subjectWithPeriod", { noun: rangeNoun, period: periodLabel }) : rangeNoun;
	const kind = data && data.prediction == null ? t("dashboard.kpi.financial.actual") : t("dashboard.kpi.financial.actualVsForecast");
	const subtitle = `${subjectLabel ? `${subjectLabel} · ` : ""}${kind}`;

	return (
		<div className="flex" style={enterStyle(shown, 0, 12)}>
			<section className={PANEL}>
				<PanelHeader icon="wallet" tone="link" title={t("dashboard.kpi.financial.title")} subtitle={subtitle}>
					<div className="ms-auto flex flex-wrap items-center gap-2">
						<div role="group" aria-label={t("dashboard.kpi.financial.rangeGroup")} className="flex gap-0.5 p-[3px] bg-colorFillQuaternary border border-solid border-colorBorder rounded-[9px]">
							{FINANCIAL_RANGES.map((r) => {
								const active = r === range;
								return (
									<button
										key={r}
										type="button"
										title={r === "fiscal_ytd" ? t("dashboard.ranges.fiscalYtdTitle") : undefined}
										aria-pressed={active}
										onClick={() => setRange(r)}
										className={`h-[26px] px-2.5 rounded-[7px] border-0 font-[inherit] text-[12px] whitespace-nowrap cursor-pointer transition-colors duration-200 ${
											active
												? "bg-colorFillTertiary text-colorText font-semibold shadow-sm"
												: "bg-transparent text-colorTextSecondary hover:text-colorText hover:bg-primaryBg"
										}`}
									>
										{t(`dashboard.ranges.${r}`)}
									</button>
								);
							})}
						</div>
					</div>
				</PanelHeader>
				{/* The height changes smoothly between states (error, number of growth chips, hidden forecast); pt-1 keeps
				    the hover:-translate-y of the cards from being cut by overflow:hidden. */}
				<AutoHeight variant="modal">
					{error
						? (
							<div className="mx-4 mb-4">
								<WidgetNotice>{t("dashboard.kpi.financial.error")}</WidgetNotice>
							</div>
						)
						: (
							<div className="grid gap-3 px-4 pt-1 pb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
								{FIN_DEFS.map((def, i) => (
									<FinancialCard key={def.key} def={def} data={data} range={range} rangeNoun={rangeNoun} p={p} shown={shown} index={i} pending={rolling} />
								))}
							</div>
						)}
				</AutoHeight>
			</section>
		</div>
	);
}
