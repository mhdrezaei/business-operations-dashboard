import type { DashboardWidgetProps } from "#src/features/dashboard/model/types";
import { buildShPeriodsRange, shPeriodKey } from "#src/features/dashboard/model/jalali";
import { serviceIdsParam } from "#src/features/dashboard/model/types";
import { widgetDataQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { RiBarChart2Line } from "#src/features/dashboard/ui/icons";
import { WidgetCardShell, WidgetError, WidgetNotice, WidgetSpinnerBox } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useDashboardServices } from "#src/features/dashboard/ui/use-dashboard-services";
import { useQuery } from "@tanstack/react-query";
import { Segmented } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { KpiCards } from "./KpiCards";
import { MonthlyTable } from "./MonthlyTable";
import { periodsLabel } from "./periods-label";
import { ServicesTable } from "./ServicesTable";

type View = "services" | "monthly";

/** KPI cards under the monthly performance chart; the range is the chart's (no control of its own). */
export function MonthlyPerformanceKpisWidget({ title, serviceIds, range }: DashboardWidgetProps) {
	const { t } = useTranslation();
	const { performanceServiceIds } = useDashboardServices();
	// This endpoint requires service_ids too: the "all" filter means every permitted service.
	const effectiveServiceIds = serviceIds.length > 0 ? serviceIds : performanceServiceIds;
	const periods = useMemo(() => buildShPeriodsRange(range.from, range.to), [range]);
	const [view, setView] = useState<View>("services");

	const enabled = effectiveServiceIds.length > 0 && periods.length > 0;
	const q = useQuery(widgetDataQuery("monthly-performance-kpis", {
		service_ids: serviceIdsParam(effectiveServiceIds),
		sh_periods: periods.map(p => shPeriodKey(p.year, p.month)).join(","),
	}, enabled));

	const data = q.data;
	const isEmpty = !!data && data.services.length === 0 && data.monthly.length === 0;
	const refreshing = q.isFetching && data !== undefined;

	let content = null;
	if (enabled) {
		if (data === null) {
			content = <WidgetNotice />;
		}
		else if (q.error) {
			content = <WidgetError message={q.error.message} />;
		}
		else if (data === undefined) {
			content = <WidgetSpinnerBox height={220} />;
		}
		else if (isEmpty) {
			content = <WidgetNotice>{t("dashboard.common.noData")}</WidgetNotice>;
		}
		else {
			content = (
				<>
					<KpiCards key={q.dataUpdatedAt} totals={data.totals} />
					<div key={view} className="dash-fade-slide-up">
						{view === "services" ? <ServicesTable services={data.services} /> : <MonthlyTable monthly={data.monthly} />}
					</div>
				</>
			);
		}
	}

	return (
		<WidgetCardShell
			icon={<RiBarChart2Line className="text-primaryText" />}
			title={title}
			description={periods.length ? t("dashboard.widgets.monthlyKpis.description", { value: periodsLabel(periods.map(p => ({ sh_year: p.year, sh_month: p.month }))) }) : undefined}
			headerExtra={(
				<Segmented<View>
					size="small"
					value={view}
					onChange={setView}
					options={[
						{ value: "services", label: t("dashboard.widgets.monthlyKpis.views.services") },
						{ value: "monthly", label: t("dashboard.widgets.monthlyKpis.views.monthly") },
					]}
				/>
			)}
			refreshing={refreshing}
		>
			{content}
		</WidgetCardShell>
	);
}
