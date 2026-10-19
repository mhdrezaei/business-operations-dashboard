import type { ReactNode } from "react";
import { formatCount } from "#src/features/dashboard/model/format";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState, monthAxisTick, TipBox } from "./chart-parts";
import { useChartTheme } from "./chart-theme";

export type ExpiringMode = "total" | "by_service";

export interface ExpiringRow {
	label: string
	total: number
	shYear: number
	shMonth: number
	values: Record<string, number>
}

export interface ExpiringSeries {
	key: string
	name: string
	color: string
}

export interface ExpiringBarClick {
	shYear: number
	shMonth: number
	label: string
	serviceKey: string | null
}

type BarDatum = Record<string, number | string> & { label: string, total: number, shYear: number, shMonth: number };

const HEIGHT = 210;

interface StackSegmentProps {
	x?: number
	y?: number
	width?: number
	height?: number
	fill?: string
	fillOpacity?: number
	payload?: BarDatum
	dataKey?: string
	series: ExpiringSeries[]
}

/**
 * Segment of a stacked column: only the top non-zero segment of each month gets the rounded top corners, so the
 * column looks like the "total" mode (earlier only the last series was rounded, months where it was zero had none).
 */
function StackSegment({ x = 0, y = 0, width = 0, height = 0, fill, fillOpacity, payload, dataKey, series }: StackSegmentProps) {
	if (!(height > 0) || !(width > 0))
		return null;
	const topKey = [...series].reverse().find(s => Number(payload?.[s.key]) > 0)?.key;
	const r = dataKey === topKey ? Math.min(5, width / 2, height) : 0;
	const d = `M${x},${y + height}L${x},${y + r}${r ? `Q${x},${y} ${x + r},${y}` : ""}L${x + width - r},${y}${r ? `Q${x + width},${y} ${x + width},${y + r}` : ""}L${x + width},${y + height}Z`;
	return <path d={d} fill={fill} fillOpacity={fillOpacity} style={{ transition: "fill-opacity .2s" }} />;
}

/** Layer of the previous chart: rendered at opacity 1, then fades to 0 on the next frame. */
function FadeOutLayer({ children }: { children: ReactNode }) {
	const [gone, setGone] = useState(false);
	useEffect(() => {
		const id = requestAnimationFrame(() => setGone(true));
		return () => cancelAnimationFrame(id);
	}, []);
	return (
		<div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: gone ? 0 : 1, pointerEvents: "none", transition: "opacity .3s ease" }}>
			{children}
		</div>
	);
}

interface ExpiringBarChartProps {
	rows: ExpiringRow[]
	mode: ExpiringMode
	/** Needed in by_service mode. */
	series?: ExpiringSeries[]
	highlightKey?: string | null
	onBarClick?: ((click: ExpiringBarClick) => void) | null
}

/** Expiring contracts per month — either one total column or a stacked column per service. */
export function ExpiringBarChart({ rows, mode, series = [], highlightKey = null, onBarClick = null }: ExpiringBarChartProps) {
	const { t } = useTranslation();
	const T = useChartTheme();
	// Switching total ↔ by service: the new chart is built fresh and its columns grow from the bottom together (no
	// stagger) while the previous chart fades out, so the two modes never mix mid-way.
	const [layers, setLayers] = useState<{ current: ExpiringMode, leaving: ExpiringMode | null }>({ current: mode, leaving: null });
	const pending = layers.current !== mode;
	// The by-service panel opens/closes together with the mode switch (300ms) and resizes the card and chart; a chart
	// built at that moment would restart its animation on every resize frame. So the previous chart (no animation,
	// just following the size) stays until the move ends, then the fresh chart is built with its animation.
	useEffect(() => {
		if (layers.current === mode)
			return undefined;
		const id = setTimeout(() => setLayers(prev => ({ current: mode, leaving: prev.current })), 330);
		return () => clearTimeout(id);
	}, [mode, layers.current]);
	useEffect(() => {
		if (!layers.leaving)
			return undefined;
		const id = setTimeout(() => setLayers(prev => ({ ...prev, leaving: null })), 350);
		return () => clearTimeout(id);
	}, [layers.leaving]);

	if (!rows.length)
		return <EmptyState height={HEIGHT} />;

	const data: BarDatum[] = rows.map(r => ({ label: r.label, total: r.total, shYear: r.shYear, shMonth: r.shMonth, ...r.values }));
	const Tick = monthAxisTick(T);
	const clickOf = (d: BarDatum, serviceKey: string | null): ExpiringBarClick => ({ shYear: d.shYear, shMonth: d.shMonth, label: d.label, serviceKey });

	const renderChart = (m: ExpiringMode, interactive: boolean, animate = interactive) => {
		const tipContent = ({ active, payload, label }: { active?: boolean, payload?: { value?: number, name?: string, color?: string, payload?: BarDatum }[], label?: string }) => {
			if (!interactive || !active || !payload?.length)
				return null;
			const total = payload[0]?.payload?.total ?? 0;
			const seriesRows = m === "by_service"
				? payload.filter(p => p.value).map(p => ({ name: p.name, color: p.color ?? T.muted, value: formatCount(p.value) }))
				: [];
			return (
				<TipBox
					title={label}
					rows={[...seriesRows, { name: t("dashboard.charts.grandTotal"), color: T.warn, value: t("dashboard.charts.contractsCount", { value: formatCount(total) }) }]}
					T={T}
				/>
			);
		};
		const clickable = interactive && !!onBarClick;
		return (
			<ResponsiveContainer width="100%" height="100%">
				<BarChart
					data={data}
					margin={{ top: 18, right: 4, left: 4, bottom: 0 }}
					style={clickable ? { cursor: "pointer" } : undefined}
					onClick={clickable
						? (state, event) => {
							// A click on a column segment is handled by Bar.onClick (with the service filter); here only the rest
							// of the month area.
							if ((event as { target?: Element } | undefined)?.target?.closest?.(".recharts-bar-rectangle"))
								return;
							const d = (state as { activePayload?: { payload?: BarDatum }[] } | null)?.activePayload?.[0]?.payload;
							if (d)
								onBarClick!(clickOf(d, null));
						}
						: undefined}
				>
					<CartesianGrid stroke={T.grid} vertical={false} />
					<XAxis dataKey="label" interval={0} tick={Tick} tickLine={false} axisLine={{ stroke: T.border }} height={40} />
					<YAxis orientation="right" allowDecimals={false} tick={{ fill: T.faint, fontSize: 11 }} width={28} axisLine={false} tickLine={false} tickFormatter={formatCount} />
					<Tooltip content={tipContent} cursor={interactive ? { fill: T.grid, fillOpacity: 0.5 } : false} wrapperStyle={{ outline: "none" }} />
					{m === "by_service"
						? series.map(s => (
							<Bar
								key={s.key}
								dataKey={s.key}
								name={s.name}
								stackId="a"
								fill={s.color}
								fillOpacity={highlightKey && highlightKey !== s.key ? 0.18 : 1}
								maxBarSize={34}
								shape={(props: unknown) => <StackSegment {...(props as Omit<StackSegmentProps, "series">)} series={series} />}
								onClick={clickable ? (d: { payload: BarDatum }) => onBarClick!(clickOf(d.payload, s.key)) : undefined}
								animationDuration={700}
								animationEasing="ease-out"
								isAnimationActive={animate}
							/>
						))
						: (
							<Bar
								dataKey="total"
								name={t("dashboard.charts.grandTotal")}
								fill={T.warn}
								maxBarSize={34}
								radius={[5, 5, 0, 0]}
								animationDuration={700}
								animationEasing="ease-out"
								isAnimationActive={animate}
								onClick={clickable ? (d: { payload: BarDatum }) => onBarClick!(clickOf(d.payload, null)) : undefined}
							>
								<LabelList dataKey="total" position="top" fill={T.muted} fontSize={11.5} formatter={(v: number) => (v ? formatCount(v) : "")} />
							</Bar>
						)}
				</BarChart>
			</ResponsiveContainer>
		);
	};

	return (
		<div dir="ltr" className={onBarClick ? "dash-bars-clickable" : undefined} style={{ position: "relative", height: HEIGHT, flex: "none", minWidth: 0 }}>
			{layers.leaving && (
				<FadeOutLayer>{renderChart(layers.leaving, false)}</FadeOutLayer>
			)}
			<div key={layers.current} style={{ position: "absolute", inset: 0 }}>
				{renderChart(layers.current, true, !pending)}
			</div>
		</div>
	);
}
