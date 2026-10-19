import type { WidgetListItem } from "#src/features/dashboard/api/dashboard.dto";
import type { DashboardRange, DashboardWidgetProps } from "#src/features/dashboard/model/types";
import type { ComponentType } from "react";
import { getCurrentJalali, shiftJalaliMonth } from "#src/features/dashboard/model/jalali";
import { homeWidgetsQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { RangeFilterPanel } from "./filters/RangeFilterPanel";
import { FILTER_ANCHOR_ID, ServiceFilterPanel } from "./filters/ServiceFilterPanel";
import { RiDashboardLine } from "./icons";
import { KpiStrip } from "./kpi-strip/KpiStrip";
import { LazyMount } from "./shell/LazyMount";
import { SectionLabel } from "./shell/SectionLabel";
import { WidgetError, WidgetNotice } from "./shell/WidgetCardShell";
import { useDashboardServices } from "./use-dashboard-services";
import { CompanyFinancialsWidget } from "./widgets/company-financials/CompanyFinancialsWidget";
import { ContractsApprovalStatusWidget } from "./widgets/contracts-approval/ContractsApprovalStatusWidget";
import { ContractsExpiringWidget } from "./widgets/contracts-expiring/ContractsExpiringWidget";
import { ContractsNotRenewedWidget } from "./widgets/contracts-not-renewed/ContractsNotRenewedWidget";
import { IncomeExpenseProfitWidget } from "./widgets/income-expense-profit/IncomeExpenseProfitWidget";
import { MonthlyPerformanceKpisWidget } from "./widgets/monthly-performance-kpis/MonthlyPerformanceKpisWidget";
import { MonthlyPerformanceWidget } from "./widgets/monthly-performance/MonthlyPerformanceWidget";
import { RegisteredPerformanceRateWidget } from "./widgets/registered-performance-rate/RegisteredPerformanceRateWidget";
import { UnregisteredPerformancesWidget } from "./widgets/unregistered-performances/UnregisteredPerformancesWidget";

const KNOWN_WIDGETS: Record<string, ComponentType<DashboardWidgetProps>> = {
	"monthly-performance": MonthlyPerformanceWidget,
	"monthly-performance-kpis": MonthlyPerformanceKpisWidget,
	"income-expense-profit": IncomeExpenseProfitWidget,
	"contracts-expiring": ContractsExpiringWidget,
	"contracts-approval-status": ContractsApprovalStatusWidget,
	"unregistered-performances": UnregisteredPerformancesWidget,
	"registered-performance-rate": RegisteredPerformanceRateWidget,
	"company-financials": CompanyFinancialsWidget,
	"contracts-not-renewed": ContractsNotRenewedWidget,
};

/** Fixed order and grouping of the cards; only cards returned by GET /home/widgets/ are rendered. */
const SECTIONS = [
	{ titleKey: "monthly", keys: ["monthly-performance", "monthly-performance-kpis"] },
	{ titleKey: "financeContracts", keys: ["contracts-not-renewed", "contracts-expiring", "income-expense-profit", "contracts-approval-status"] },
	{ titleKey: "registration", keys: ["registered-performance-rate", "unregistered-performances"] },
	{ titleKey: "companyFinancials", keys: ["company-financials"] },
] as const;
const FULL_WIDTH_KEYS = new Set(["monthly-performance", "monthly-performance-kpis", "income-expense-profit", "contracts-approval-status", "company-financials"]);
/** Not a card: its presence only enables the drill-down of the line chart. */
const DRILLDOWN_KEY = "monthly-performance-breakdown";

function defaultRange(): DashboardRange {
	// The current month is incomplete; the default is the 6 months up to last month.
	const last = shiftJalaliMonth(getCurrentJalali(), -1);
	return { from: shiftJalaliMonth(last, -5), to: last };
}

/** `active`: the page's tab is shown. The floating filter panels are portaled to body, so they render only then. */
export function DashboardWidgetsSection({ active }: { active: boolean }) {
	const { t } = useTranslation();
	const widgetsQuery = useQuery(homeWidgetsQuery());
	const { services } = useDashboardServices();

	const [serviceIds, setServiceIds] = useState<number[]>([]);
	// "No service" differs from an empty serviceIds (= all); it is a separate flag.
	const [noneSelected, setNoneSelected] = useState(false);
	const [range, setRange] = useState(defaultRange);
	// The floating range panel replaces the range bar inside the chart card when there is room for it.
	const [rangePanelActive, setRangePanelActive] = useState(false);

	const widgets: WidgetListItem[] = useMemo(() => widgetsQuery.data ?? [], [widgetsQuery.data]);
	const canDrilldown = widgets.some(w => w.key === DRILLDOWN_KEY);
	const byKey = useMemo(() => new Map(widgets.filter(w => KNOWN_WIDGETS[w.key]).map(w => [w.key, w])), [widgets]);
	const loading = widgetsQuery.isPending;
	const error = widgetsQuery.isError ? (widgetsQuery.error.message || t("dashboard.page.widgetsError")) : null;

	return (
		<div className="flex flex-col gap-4">
			{active && (
				<>
					<RangeFilterPanel range={range} onChange={setRange} onActiveChange={setRangePanelActive} />
					<ServiceFilterPanel
						services={services}
						value={serviceIds}
						onChange={setServiceIds}
						none={noneSelected}
						onNoneChange={setNoneSelected}
					/>
				</>
			)}
			<section id={FILTER_ANCHOR_ID} className="flex flex-col gap-3.5 dash-rise-in min-w-0 w-full">
				<div className="flex items-center gap-2.5">
					<RiDashboardLine className="text-lg text-primaryText" />
					<h2 className="m-0 text-[15.5px] font-semibold text-colorText">{t("dashboard.page.chartsTitle")}</h2>
				</div>

				{noneSelected && <WidgetNotice>{t("dashboard.page.noServiceSelected")}</WidgetNotice>}

				{/* Cards are not unmounted on "no service" so their inner filters are not reset; they only fade and lock. */}
				<div
					aria-hidden={noneSelected}
					className={`flex flex-col gap-5 transition-opacity duration-300 ${noneSelected ? "opacity-40 pointer-events-none select-none" : ""}`}
				>
					{!loading && !error && byKey.size > 0 && (
						<>
							<SectionLabel>{t("dashboard.page.sections.kpi")}</SectionLabel>
							<KpiStrip serviceIds={serviceIds} />
						</>
					)}

					{loading
						? (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								{[0, 1].map(i => <span key={i} className="inline-block w-full h-[300px] rounded-[14px] bg-colorFillQuaternary animate-pulse" />)}
							</div>
						)
						: error
							? <WidgetError message={error} />
							: byKey.size === 0
								? <WidgetNotice>{t("dashboard.page.noWidgets")}</WidgetNotice>
								: SECTIONS.map((section) => {
									const items = section.keys.map(key => byKey.get(key)).filter((w): w is WidgetListItem => !!w);
									if (items.length === 0)
										return null;
									return (
										<div key={section.titleKey} className="flex flex-col gap-3.5">
											<SectionLabel>{t(`dashboard.page.sections.${section.titleKey}`)}</SectionLabel>
											{/* Fixed two columns: with auto-fit a full-width card kept an empty column alive. */}
											<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
												{items.map((widget) => {
													const Widget = KNOWN_WIDGETS[widget.key];
													return (
														<div id={widget.key} key={widget.key} className={`flex flex-col min-w-0 [&>section]:flex-1 ${FULL_WIDTH_KEYS.has(widget.key) ? "lg:col-span-2" : ""}`}>
															<LazyMount>
																<Widget
																	title={widget.title}
																	canDrilldown={canDrilldown}
																	serviceIds={serviceIds}
																	range={range}
																	onRangeChange={setRange}
																	hideRangeBar={rangePanelActive}
																/>
															</LazyMount>
														</div>
													);
												})}
											</div>
										</div>
									);
								})}
				</div>
			</section>
		</div>
	);
}
