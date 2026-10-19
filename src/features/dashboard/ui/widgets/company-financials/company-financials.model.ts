import type { CompanyFinancialsChart, FinancialMetric } from "#src/features/dashboard/api/dashboard.dto";
import type { ChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import { formatNumber, toNum } from "#src/features/dashboard/model/format";
import { colorAt } from "#src/features/dashboard/ui/charts/chart-theme";
import { useRef } from "react";

export const PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 400;
export const OTHER_KEY = "other";

export interface StackSegment {
	key: string
	name: string
	share: string | null
	weight: number
	color: string
}

export interface StackModel {
	key: "income" | "expense"
	segs: StackSegment[]
}

export interface LegendItem {
	key: string
	name: string
	color: string
}

export function rowKey(o: { service_id: number, company_id: number }) {
	return `${o.service_id}-${o.company_id}`;
}

/** Bar/accent color of a metric. */
export function metricColor(T: ChartTheme, metric: FinancialMetric) {
	return metric === "income" ? T.ok : metric === "expense" ? T.danger : T.link;
}

/** Amounts are decimal strings; rounded only for display (sorting/summing is server side). */
export function moneyText(v: unknown) {
	const n = toNum(v);
	return n === null ? "—" : formatNumber(Math.round(n));
}

export function isNegative(v: unknown) {
	return (toNum(v) ?? 0) < 0;
}

/** The reference stays while its content is unchanged: every table response brings a fresh chart object, but the chart must not rebuild/animate. */
export function useStableValue<T>(value: T): T {
	const ref = useRef(value);
	const sigRef = useRef(JSON.stringify(value));
	const sig = JSON.stringify(value);
	if (sig !== sigRef.current) {
		sigRef.current = sig;
		ref.current = value;
	}
	return ref.current;
}

/**
 * The same company has the same color in the chart and the table; companies outside the top ones ("other") are neutral.
 * Shares come from the server; the amount is only the flex weight of a segment.
 */
export function buildChartModel(chart: Record<string, CompanyFinancialsChart> | undefined, T: ChartTheme, otherName: string) {
	const colorOf: Record<string, string> = {};
	const legend: LegendItem[] = [];
	const stacks: StackModel[] = [];
	if (!chart)
		return { colorOf, legend, stacks };
	const sources = [["income", chart.income], ["expense", chart.expense]] as const;
	sources.forEach(([, st]) =>
		(st?.items ?? []).forEach((it) => {
			const k = rowKey(it);
			if (!colorOf[k]) {
				colorOf[k] = colorAt(T, legend.length);
				legend.push({ key: k, name: it.company_name, color: colorOf[k] });
			}
		}),
	);
	if (sources.some(([, st]) => (toNum(st?.other?.amount) ?? 0) > 0))
		legend.push({ key: OTHER_KEY, name: otherName, color: T.faint });
	sources.forEach(([key, st]) => {
		const segs: StackSegment[] = (st?.items ?? []).map(it => ({
			key: rowKey(it),
			name: it.company_name,
			share: it.share,
			weight: Math.max(0, toNum(it.amount) ?? 0),
			color: colorOf[rowKey(it)],
		}));
		if (st?.other && (toNum(st.other.amount) ?? 0) > 0)
			segs.push({ key: OTHER_KEY, name: otherName, share: st.other.share, weight: toNum(st.other.amount) ?? 0, color: T.faint });
		stacks.push({ key, segs: segs.filter(g => g.weight > 0) });
	});
	return { colorOf, legend, stacks };
}
