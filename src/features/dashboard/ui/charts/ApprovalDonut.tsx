import { formatCount, formatNumber } from "#src/features/dashboard/model/format";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { TipBox } from "./chart-parts";
import { useChartTheme } from "./chart-theme";

export type DonutTone = "ok" | "warn" | "faint";

export interface DonutSegment<K extends string = string> {
	key: K
	label: string
	value: number
	tone: DonutTone
}

interface DonutDatum {
	key?: string
	n: string
	v: number
	c: string
}

/** Approval donut (business / contract office) — 96×96 ring with the approved percent in the middle. */
export function ApprovalDonut<K extends string>({ segments = [], onOpen }: { segments: DonutSegment<K>[], onOpen?: (key: K | undefined) => void }) {
	const { t } = useTranslation();
	const T = useChartTheme();
	const colorOf: Record<DonutTone, string> = { ok: T.ok, warn: T.warn, faint: T.faint };
	const approved = segments.find(s => s.tone === "ok")?.value || 0;
	const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);
	const data: DonutDatum[] = total
		? segments.map(s => ({ key: s.key, n: s.label, v: s.value || 0, c: colorOf[s.tone] }))
		: [{ n: t("dashboard.common.noData"), v: 1, c: T.track }];
	const pct = total ? Math.round((approved / total) * 100) : null;
	const clickable = !!onOpen && total > 0;

	return (
		<div dir="ltr" style={{ position: "relative", width: 96, height: 96, flex: "none" }}>
			<PieChart width={96} height={96}>
				<Pie
					data={data}
					dataKey="v"
					nameKey="n"
					cx="50%"
					cy="50%"
					innerRadius={34}
					outerRadius={46}
					startAngle={90}
					endAngle={-270}
					stroke="none"
					paddingAngle={total ? 1 : 0}
					animationDuration={1000}
					animationEasing="ease-out"
					isAnimationActive
					onClick={(_, i) => clickable && onOpen!(data[i].key as K)}
				>
					{data.map((d, i) => (
						<Cell key={i} fill={d.c} style={{ cursor: clickable ? "pointer" : "default", outline: "none" }} />
					))}
				</Pie>
				<Tooltip
					content={({ active, payload }) => {
						const p = payload?.[0];
						if (!active || !p || !total)
							return null;
						const value = Number(p.value);
						return (
							<TipBox
								title={p.name}
								rows={[{
									name: t("dashboard.charts.count"),
									color: (p.payload as DonutDatum).c,
									value: `${formatCount(value)} (${formatCount(Math.round((value / total) * 100))}٪)`,
								}]}
								T={T}
							/>
						);
					}}
					wrapperStyle={{ outline: "none", zIndex: 5 }}
				/>
			</PieChart>
			<button
				type="button"
				onClick={() => onOpen?.(undefined)}
				disabled={!clickable}
				aria-label={t("dashboard.charts.openAll")}
				className="absolute inset-0 m-auto w-[58px] h-[58px] p-0 border-0 rounded-full grid place-items-center bg-transparent text-colorText text-[15px] font-semibold font-[inherit] enabled:cursor-pointer enabled:hover:bg-colorFillTertiary transition-colors"
			>
				{pct === null ? "—" : `${formatNumber(pct)}٪`}
			</button>
		</div>
	);
}
