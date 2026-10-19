import { formatNumber } from "#src/features/dashboard/model/format";
import { useEffect, useRef, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { useChartTheme } from "./chart-theme";

/** Smooth count from the currently *shown* value to the target (both filling and emptying); first time from zero. */
function useRateCountUp(target: number | null | undefined, durationMs = 1200) {
	const end = Number.isFinite(target) ? (target as number) : 0;
	const [value, setValue] = useState(0);
	const valueRef = useRef(0);
	useEffect(() => {
		const from = valueRef.current;
		const start = performance.now();
		const set = (v: number) => {
			valueRef.current = v;
			setValue(v);
		};
		let frame = requestAnimationFrame(function tick(now) {
			const t = Math.min(1, (now - start) / durationMs);
			set(from + (end - from) * (1 - (1 - t) ** 3));
			if (t < 1)
				frame = requestAnimationFrame(tick);
		});
		// rAF may not run (background tab); land on the final value anyway.
		const settle = setTimeout(() => set(end), durationMs + 50);
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(settle);
		};
	}, [end, durationMs]);
	return value;
}

/** Target percent of the registration-rate tiles; at or above it the tone is "ok". */
export const RATE_TARGET = 80;
const RATE_WARN = 50;

export function rateTone(percentage: number | null | undefined): "ok" | "warn" | "danger" | "faint" {
	if (percentage === null || percentage === undefined)
		return "faint";
	return percentage >= RATE_TARGET ? "ok" : percentage >= RATE_WARN ? "warn" : "danger";
}

/** Half-circle gauge of the registered-performance percent. */
export function RateGauge({ percentage }: { percentage: number | null | undefined }) {
	const T = useChartTheme();
	const shownPercentage = useRateCountUp(percentage);
	const color = { ok: T.ok, warn: T.warn, danger: T.danger, faint: T.faint }[rateTone(percentage)];
	// The arc is drawn with the counting value (not Recharts' animation) so every target change fills/empties from the
	// previous value.
	const value = Math.min(Math.max(shownPercentage, 0.8), 100);

	return (
		<div dir="ltr" style={{ position: "relative", width: 200, height: 110, flex: "none" }}>
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie data={[{ v: 100 }]} dataKey="v" cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius="118%" outerRadius="150%" stroke="none" fill={T.track} isAnimationActive={false} />
					<Pie data={[{ v: value }, { v: 100 - value }]} dataKey="v" cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius="118%" outerRadius="150%" stroke="none" cornerRadius={6} isAnimationActive={false}>
						<Cell fill={color} />
						<Cell fill="transparent" />
					</Pie>
				</PieChart>
			</ResponsiveContainer>
			<span style={{ position: "absolute", insetInline: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
				<strong style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.2, color }}>
					{percentage === null || percentage === undefined ? "—" : `${formatNumber(shownPercentage, { maximumFractionDigits: 2 })}٪`}
				</strong>
			</span>
		</div>
	);
}
