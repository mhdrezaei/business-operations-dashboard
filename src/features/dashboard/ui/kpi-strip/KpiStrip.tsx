import type { KpiListKey } from "#src/features/dashboard/api/dashboard.dto";
import type { KpiMotion } from "./kpi-motion";
import type { KpiListTarget } from "./KpiListModal";
import { serviceIdsParam } from "#src/features/dashboard/model/types";
import { WidgetNotice } from "#src/features/dashboard/ui/shell/WidgetCardShell";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { ActionPanel } from "./ActionPanel";
import { ContractCyclePanel } from "./ContractCyclePanel";
import { FinancialPanel } from "./FinancialPanel";
import { useReveal, useRollTick, useSampled } from "./kpi-motion";
import { KpiListModal } from "./KpiListModal";
import { useKpiData } from "./use-kpi-data";

/**
 * KPI strip at the top of the dashboard, built entirely on the client from the cards' endpoints. Every null/invalid
 * number means "no data", never zero.
 *
 * Until the data arrives the same layout is shown with zeros and rolling digits (no spinner/skeleton); when both the
 * tiles and the dashboard counters have arrived, the entry animations (counting, bars, contract-cycle chain) play once.
 */
export function KpiStrip({ serviceIds }: { serviceIds: number[] }) {
	const { t } = useTranslation();
	const { tiles, dashboard, pending, failed } = useKpiData(serviceIdsParam(serviceIds));
	// Opened list of one number, or null. A key that answered 404 (no access) becomes non-clickable.
	const [listTarget, setListTarget] = useState<KpiListTarget | null>(null);
	const [deniedKeys, setDeniedKeys] = useState<Set<KpiListKey>>(() => new Set());
	const markDenied = useCallback((key: KpiListKey) => setDeniedKeys(prev => (prev.has(key) ? prev : new Set(prev).add(key))), []);
	const closeList = useCallback(() => setListTarget(null), []);

	const { p, shown } = useReveal(tiles, dashboard, 1200, 0, false, pending);
	// The contract-cycle chain starts after the panel entry and advances linearly (each step has its own easing).
	const { p: chainQ } = useReveal(tiles, dashboard, 1100, 0, true, pending);
	// Digits roll until the data arrives and during the first moment of counting too, so neither zero nor a pause is
	// seen and the roll flows into the smooth count.
	const pn = useSampled(p);
	const rolling = pending || p < 0.3;
	useRollTick(rolling);

	if (failed)
		return <WidgetNotice>{t("dashboard.kpi.error")}</WidgetNotice>;

	const motion: KpiMotion = { p, pn, shown, rolling };
	return (
		<div className="relative flex flex-col gap-3">
			<div className="flex flex-col gap-3">
				{/* Financial performance: actual vs. forecast; fetches its own financial-summary. */}
				<FinancialPanel serviceIds={serviceIds} />
				<div className="flex flex-wrap gap-3">
					<ContractCyclePanel tiles={tiles} dashboard={dashboard} motion={motion} chainQ={chainQ} deniedKeys={deniedKeys} onOpenList={setListTarget} />
					<ActionPanel tiles={tiles} motion={motion} pending={pending} />
				</div>
			</div>
			<KpiListModal target={listTarget} serviceIds={serviceIds} onClose={closeList} onDenied={markDenied} />
		</div>
	);
}
