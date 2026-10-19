import type { ReactNode } from "react";
import type { ChartTheme } from "./chart-theme";
import { useTranslation } from "react-i18next";

export function EmptyState({ height }: { height: number }) {
	const { t } = useTranslation();
	return (
		<div style={{ height }} className="grid place-items-center text-[12.5px] text-colorTextTertiary">
			{t("dashboard.common.noData")}
		</div>
	);
}

export interface TickProps {
	x?: number
	y?: number
	payload?: { value?: unknown }
}

/** Two-line X tick: month name above, year below. */
export function monthAxisTick(T: ChartTheme) {
	return function MonthTick({ x, y, payload }: TickProps) {
		const parts = String(payload?.value ?? "").split(" ");
		return (
			<g transform={`translate(${x},${y})`}>
				<text textAnchor="middle" fill={T.muted} fontSize={11.5} dy={14}>
					{parts[0]}
				</text>
				<text textAnchor="middle" fill={T.faint} fontSize={10.5} dy={28}>
					{parts[1] || ""}
				</text>
			</g>
		);
	};
}

export interface TipRow {
	name: ReactNode
	color: string
	value: ReactNode
	onClick?: () => void
}

/** Shared tooltip box of every chart. `pinned`: the fixed, clickable picker variant. */
export function TipBox({ title, rows, foot, T, pinned = false }: { title: ReactNode, rows: TipRow[], foot?: ReactNode, T: ChartTheme, pinned?: boolean }) {
	return (
		<div
			dir="rtl"
			className="dash-chart-tip backdrop-blur-xl"
			onClick={e => e.stopPropagation()}
			style={{
				minWidth: 200,
				padding: "9px 11px",
				background: T.elevated,
				border: `1px solid ${pinned ? T.primary : T.border}`,
				borderRadius: 10,
				boxShadow: pinned ? `${T.shadow}, 0 0 0 1px ${T.primary}` : T.shadow,
				transition: "border-color .2s ease, box-shadow .25s ease",
				fontFamily: "inherit",
				fontSize: 12,
				color: T.text,
				display: "flex",
				flexDirection: "column",
				gap: 5,
			}}
		>
			<strong style={{ fontWeight: 600, fontSize: 12.5 }}>{title}</strong>
			{rows.map((r, i) => (
				<div
					key={i}
					role={r.onClick ? "button" : undefined}
					tabIndex={r.onClick ? 0 : undefined}
					onClick={r.onClick}
					onKeyDown={r.onClick ? e => (e.key === "Enter" || e.key === " ") && r.onClick!() : undefined}
					className={r.onClick ? "dash-chart-tip-row" : undefined}
					style={{
						display: "flex",
						alignItems: "center",
						gap: 7,
						...(r.onClick ? { cursor: "pointer", margin: "0 -6px", padding: "4px 6px", borderRadius: 6 } : null),
					}}
				>
					<span style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flex: "none" }} />
					<span style={{ color: T.muted }}>{r.name}</span>
					<span style={{ marginInlineStart: "auto", fontWeight: 600, paddingInlineStart: 12 }}>{r.value}</span>
				</div>
			))}
			{foot && <span style={{ color: T.faint, fontSize: 11 }}>{foot}</span>}
		</div>
	);
}

/** "Nice" Y domain; always contains zero (like Recharts' default). */
export function niceDomain(values: number[]): [number, number] {
	const lo = Math.min(0, ...values);
	let hi = Math.max(0, ...values);
	if (lo === hi)
		hi = lo + 1;
	const raw = (hi - lo) / 4;
	const pow = 10 ** Math.floor(Math.log10(raw));
	const f = raw / pow;
	const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
	return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}
