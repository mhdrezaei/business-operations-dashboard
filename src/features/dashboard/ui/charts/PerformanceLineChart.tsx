import type { ReactNode } from "react";
import type { TooltipProps } from "recharts";
import type { TickProps, TipRow } from "./chart-parts";
import { formatCount, formatRialCompact } from "#src/features/dashboard/model/format";
import { prefersReducedMotion } from "#src/features/dashboard/model/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState, monthAxisTick, niceDomain, TipBox } from "./chart-parts";
import { useChartTheme } from "./chart-theme";

export interface LineSeries<Raw = unknown> {
	key: string
	label: string
	color: string
	points: { value: number | null, raw?: Raw }[]
}

type ChartRow = Record<string, number | string | boolean | null> & { label: string, x: number, _b: boolean };

interface AnimatedView {
	data: ChartRow[]
	domain: [number, number]
}

const HEIGHT = 380;
const META_KEYS = new Set(["label", "x", "_b"]);

function lerp(a: unknown, b: unknown, e: number) {
	return typeof a === "number" && typeof b === "number" ? a + (b - a) * e : b;
}

/**
 * Range grows/shrinks: shared months slide along the axis, new months open from the previous range edge (the line
 * extends) and removed months collapse into the edge (the line shortens). `x` is the 0..1 position of each month.
 */
function blendRows(fromRows: ChartRow[], toRows: ChartRow[], e: number): ChartRow[] {
	const fromByLabel = new Map(fromRows.map(r => [r.label, r]));
	const toByLabel = new Map(toRows.map(r => [r.label, r]));
	const keptTo = toRows.filter(r => fromByLabel.has(r.label));
	const mix = (fromRow: ChartRow, toRow: ChartRow, base: ChartRow) => {
		const out = { label: base.label, x: lerp(fromRow.x, toRow.x, e), _b: toByLabel.has(base.label) } as ChartRow;
		Object.keys(base).forEach((k) => {
			if (!META_KEYS.has(k))
				out[k] = lerp(fromRow[k], toRow[k], e) as ChartRow[string];
		});
		return out;
	};
	if (keptTo.length === 0)
		return toRows;
	const out: ChartRow[] = [];
	const firstKept = keptTo[0].label;
	const lastKept = keptTo[keptTo.length - 1].label;
	// New months: start at the old edge point (same position and value) and open to their final place.
	const toIndex = new Map(toRows.map((r, i) => [r.label, i]));
	toRows.forEach((r) => {
		const old = fromByLabel.get(r.label);
		if (old) {
			out.push(mix(old, r, r));
		}
		else {
			const edgeLabel = toIndex.get(r.label)! < toIndex.get(firstKept)! ? firstKept : lastKept;
			out.push(mix(fromByLabel.get(edgeLabel)!, r, r));
		}
	});
	// Removed months: move from their place into the new edge point and are dropped at the end.
	const fromIndex = new Map(fromRows.map((r, i) => [r.label, i]));
	const firstKeptFrom = Math.min(...keptTo.map(r => fromIndex.get(r.label)!));
	fromRows.forEach((r) => {
		if (toByLabel.has(r.label))
			return;
		const edgeLabel = fromIndex.get(r.label)! < firstKeptFrom ? firstKept : lastKept;
		out.push(mix(r, toByLabel.get(edgeLabel)!, r));
	});
	return out.sort((a, b) => a.x - b.x);
}

/**
 * Slides line values and the axis domain together from the current state to the new one (Recharts' own animation
 * restarted on every frame, so we interpolate ourselves).
 */
function useAnimatedView(target: AnimatedView, signature: string, keySig: string, duration = 650): AnimatedView {
	const [view, setView] = useState(target);
	const viewKeySig = useRef(keySig);
	const current = useRef(target);
	const latest = useRef(target);
	latest.current = target;
	const raf = useRef(0);
	const mounted = useRef(false);
	useEffect(() => {
		// The first render (e.g. after a range change rebuilds the chart) has nothing to slide; setting data every frame
		// here would keep resetting the line-drawing animation.
		if (!mounted.current) {
			mounted.current = true;
			return undefined;
		}
		const from = current.current;
		const to = latest.current;
		// The set of lines changed (merge ↔ split): the chart is rebuilt, no interpolation.
		if (viewKeySig.current !== keySig) {
			viewKeySig.current = keySig;
			current.current = to;
			setView(to);
			return undefined;
		}
		if (prefersReducedMotion()) {
			current.current = to;
			setView(to);
			return undefined;
		}
		const start = performance.now();
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / duration);
			const e = 1 - (1 - t) ** 3;
			const next: AnimatedView = {
				domain: [lerp(from.domain[0], to.domain[0], e) as number, lerp(from.domain[1], to.domain[1], e) as number],
				data: blendRows(from.data, to.data, e),
			};
			current.current = next;
			setView(next);
			if (t < 1)
				raf.current = requestAnimationFrame(tick);
		};
		raf.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf.current);
	}, [signature, keySig, duration]);
	// Before the effect runs, read the target directly if the set of lines changed.
	return viewKeySig.current === keySig ? view : target;
}

interface ChartState {
	activeTooltipIndex?: number
	activeCoordinate?: { x: number, y: number }
	chartX?: number
	chartY?: number
}

interface PerformanceLineChartProps<S extends LineSeries> {
	series: S[]
	/** Label of each column (output of jalaliMonthLabel). */
	xLabels: string[]
	/** Click on a month column (after picking a series when several have a value). */
	onPointClick?: (series: S, pointIndex: number) => void
	/** Click on a line itself — hides the series, like the legend chips. */
	onLineClick?: (series: S) => void
	valueFormatter?: (value: number) => ReactNode
}

/** Monthly performance line chart — one Line per series (service_id + company_type). */
export function PerformanceLineChart<S extends LineSeries>({ series, xLabels, onPointClick, onLineClick, valueFormatter = formatCount }: PerformanceLineChartProps<S>) {
	const { t } = useTranslation();
	const T = useChartTheme();
	const hasAnyValue = series.some(s => s.points.some(p => p.value !== null && p.value !== undefined));
	const allValues = series.flatMap(s => s.points.map(p => p.value).filter((v): v is number => v !== null && v !== undefined));
	const posOf = (i: number) => (xLabels.length > 1 ? i / (xLabels.length - 1) : 0.5);
	const targetData: ChartRow[] = xLabels.map((label, i) => {
		const row = { label, x: posOf(i), _b: true } as ChartRow;
		series.forEach((s) => {
			const value = s.points[i]?.value ?? null;
			row[s.key] = value;
			row[`${s.key}__hit`] = value;
		});
		return row;
	});
	const signature = JSON.stringify(targetData);
	const keySig = series.map(s => s.key).join("|");
	const { data, domain: yDomain } = useAnimatedView({ data: targetData, domain: niceDomain(allValues) }, signature, keySig);
	// The line-drawing animation plays only for each fresh set of lines; afterwards useAnimatedView moves them.
	// The state is tied to keySig so the animation is on in the very first render of a new set (not one render later).
	const [draw, setDraw] = useState({ sig: keySig, on: true });
	const firstDraw = draw.sig === keySig ? draw.on : true;
	useEffect(() => {
		// Duration = animation length + margin; turning it off earlier jumps the animation mid-way.
		const id = setTimeout(() => setDraw({ sig: keySig, on: false }), 1100 + 300);
		return () => clearTimeout(id);
	}, [keySig]);
	// If only the values change before the first animation ends (e.g. income → expense), stop it at once so it does
	// not fight our interpolation.
	const seenSignature = useRef({ signature, keySig });
	useEffect(() => {
		const seen = seenSignature.current;
		seenSignature.current = { signature, keySig };
		if (seen.signature !== signature && seen.keySig === keySig)
			setDraw({ sig: keySig, on: false });
	}, [signature, keySig]);
	const [hoverClickable, setHoverClickable] = useState(false);
	const [picker, setPicker] = useState<{ index: number, x: number, y: number } | null>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	// Must stay before the early return: hiding the only series would change the hook count and crash the page.
	useEffect(() => {
		if (!picker)
			return undefined;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPicker(null);
		// A click anywhere outside the chart closes the pinned box (clicks inside are handled in handleChartClick).
		const onDown = (e: MouseEvent) => {
			if (!wrapRef.current?.contains(e.target as Node))
				setPicker(null);
		};
		window.addEventListener("keydown", onKey);
		document.addEventListener("mousedown", onDown);
		return () => {
			window.removeEventListener("keydown", onKey);
			document.removeEventListener("mousedown", onDown);
		};
	}, [picker]);
	if (!xLabels.length || !hasAnyValue)
		return <EmptyState height={HEIGHT} />;

	const hasNegative = allValues.some(v => v < 0);
	const Tick = monthAxisTick(T);
	// Month labels on the numeric axis: only months of the new range (while sliding) get a tick.
	const tickRows = data.filter(r => r._b !== false);
	const labelByX = new Map(tickRows.map(r => [r.x, r.label]));
	const tickXs = [...labelByX.keys()];

	const tipContent = ({ active, payload, label }: TooltipProps<number, string>) => {
		if (!active || !payload?.length)
			return null;
		const rows: TipRow[] = payload
			.filter(p => p.value !== null && p.value !== undefined && !String(p.dataKey).endsWith("__hit"))
			.sort((a, b) => b.value! - a.value!)
			.map(p => ({ name: p.name, color: p.color ?? T.muted, value: valueFormatter(p.value!) }));
		if (!rows.length)
			return null;
		return <TipBox title={(payload[0]?.payload as ChartRow | undefined)?.label ?? String(label)} rows={rows} foot={onPointClick ? t("dashboard.charts.lineTipFoot") : undefined} T={T} />;
	};

	// A click anywhere in a month column opens that month's details; with several visible series a picker appears.
	// Cursor: Recharts sets cursor:default on its wrapper, so pointer has to come through the LineChart style.
	// A month whose visible series are all null or zero has no details: neither click nor pointer cursor.
	const candidatesAt = (index: number) => series.filter((s) => {
		const v = s.points[index]?.value;
		return v !== null && v !== undefined && v !== 0;
	});
	// While the range slides the rows include leaving months; map the index back to the real series index by label.
	const realIndex = (state: ChartState | null) => (typeof state?.activeTooltipIndex === "number" ? xLabels.indexOf(data[state.activeTooltipIndex]?.label) : -1);
	const handleChartMove = (state: ChartState | null) => {
		const index = realIndex(state);
		const ok = !!onPointClick && index >= 0 && candidatesAt(index).length > 0;
		setHoverClickable(prev => (prev === ok ? prev : ok));
	};
	const handleChartClick = (state: ChartState | null) => {
		if (!onPointClick || !state)
			return;
		const index = realIndex(state);
		if (index < 0)
			return;
		const candidates = candidatesAt(index);
		if (!candidates.length)
			return;
		if (candidates.length === 1) {
			setPicker(null);
			onPointClick(candidates[0], index);
			return;
		}
		// Several services in one month: guessing by the mouse position is not precise; let the user pick.
		if (picker && picker.index === index) {
			setPicker(null);
			return;
		}
		// Same coordinates as the hover tooltip (+10 gap); near the right edge it flips to the left of the point.
		const boxW = 300;
		const width = wrapRef.current?.clientWidth ?? 800;
		const cx = state.activeCoordinate?.x ?? state.chartX ?? 0;
		const cy = state.activeCoordinate?.y ?? state.chartY ?? 0;
		const x = cx + 10 + boxW > width ? Math.max(4, cx - 10 - boxW) : cx + 10;
		const y = Math.max(4, Math.min(cy + 10, HEIGHT - 40 - (50 + 24 * candidates.length)));
		setPicker({ index, x, y });
	};

	const pickerItems = picker ? [...candidatesAt(picker.index)].sort((a, b) => (b.points[picker.index].value ?? 0) - (a.points[picker.index].value ?? 0)) : [];
	const pinnedTip = picker && (
		<div className="absolute z-20" style={{ left: picker.x, top: picker.y }}>
			<TipBox
				T={T}
				pinned
				title={xLabels[picker.index]}
				rows={pickerItems.map(sv => ({
					name: sv.label,
					color: sv.color,
					value: valueFormatter(sv.points[picker.index].value as number),
					onClick: () => {
						const i = picker.index;
						setPicker(null);
						onPointClick?.(sv, i);
					},
				}))}
				foot={t("dashboard.charts.pickSeries")}
			/>
		</div>
	);

	return (
		<div ref={wrapRef} dir="ltr" style={{ height: HEIGHT, minHeight: HEIGHT, flexShrink: 0, minWidth: 0, position: "relative" }}>
			{pinnedTip}
			<ResponsiveContainer key={keySig} width="100%" height="100%">
				<LineChart
					data={data}
					margin={{ top: 12, right: 8, left: 4, bottom: 0 }}
					onClick={state => handleChartClick(state as ChartState | null)}
					onMouseMove={state => handleChartMove(state as ChartState | null)}
					onMouseLeave={() => setHoverClickable(false)}
					style={hoverClickable ? { cursor: "pointer" } : undefined}
				>
					<CartesianGrid stroke={T.grid} vertical={false} />
					<XAxis
						type="number"
						dataKey="x"
						domain={[0, 1]}
						ticks={tickXs}
						interval={0}
						tick={(props: TickProps) => <Tick {...props} payload={{ ...props.payload, value: labelByX.get(props.payload?.value as number) ?? "" }} />}
						tickLine={false}
						axisLine={{ stroke: T.border }}
						height={40}
						padding={{ left: 18, right: 18 }}
					/>
					<YAxis
						orientation="left"
						tickFormatter={formatRialCompact}
						tick={{ fill: T.faint, fontSize: 11, textAnchor: "end" }}
						width={92}
						axisLine={false}
						tickLine={false}
						tickCount={5}
						domain={yDomain}
						allowDataOverflow
					/>
					{hasNegative && <ReferenceLine y={0} stroke={T.muted} strokeDasharray="3 3" />}
					<Tooltip
						content={tipContent}
						active={picker ? false : undefined}
						cursor={picker ? false : { stroke: T.muted, strokeDasharray: "3 3" }}
						wrapperStyle={{ outline: "none" }}
					/>
					{onLineClick && series.map(s => (
						<Line
							key={`${s.key}__hit`}
							dataKey={`${s.key}__hit`}
							name={`${s.label}__hit`}
							type="monotone"
							stroke="transparent"
							strokeWidth={20}
							connectNulls
							dot={false}
							activeDot={false}
							isAnimationActive={false}
							legendType="none"
							cursor="pointer"
							onClick={() => onLineClick(s)}
						/>
					))}
					{series.map(s => (
						<Line
							key={s.key}
							dataKey={s.key}
							name={s.label}
							type="monotone"
							stroke={s.color}
							strokeWidth={2.2}
							connectNulls
							dot={{ r: 3.5, fill: T.surface, stroke: s.color, strokeWidth: 2 }}
							activeDot={{
								r: 6,
								stroke: T.surface,
								strokeWidth: 2,
								fill: s.color,
								style: { cursor: onPointClick ? "pointer" : "default" },
							}}
							isAnimationActive={firstDraw}
							animationBegin={0}
							animationDuration={1100}
							animationEasing="ease-out"
						/>
					))}
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
