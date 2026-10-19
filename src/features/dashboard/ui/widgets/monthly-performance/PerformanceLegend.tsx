import type { LegendGroup } from "./performance-series";
import { formatCount, formatRialCompact } from "#src/features/dashboard/model/format";
import { prefersReducedMotion } from "#src/features/dashboard/model/navigation";
import { RiFunctions, RiStackLine } from "#src/features/dashboard/ui/icons";
import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const BUTTON_RESET = "bg-transparent border-0 p-0 font-[inherit] cursor-pointer";

interface PerformanceLegendProps {
	groups: LegendGroup[]
	hiddenKeys: string[]
	expandedServiceIds: number[]
	onToggleSeries: (key: string) => void
	onToggleExpanded: (serviceId: number) => void
}

/**
 * All services wrap side by side in one flow; an expanded service takes the full width (moves to the next line) and
 * returns next to the others when merged. The moves are animated with FLIP.
 */
export function PerformanceLegend({ groups, hiddenKeys, expandedServiceIds, onToggleSeries, onToggleExpanded }: PerformanceLegendProps) {
	const { t } = useTranslation();
	// FLIP: group positions are stored before the change and slid from the old place to the new one after layout.
	const groupRefs = useRef(new Map<number, HTMLDivElement>());
	const prevRects = useRef<Map<number, DOMRect> | null>(null);
	useLayoutEffect(() => {
		const prev = prevRects.current;
		prevRects.current = null;
		if (!prev || prefersReducedMotion())
			return;
		groupRefs.current.forEach((el, id) => {
			const before = prev.get(id);
			if (!before)
				return;
			const after = el.getBoundingClientRect();
			const dx = before.left - after.left;
			const dy = before.top - after.top;
			if (!dx && !dy)
				return;
			el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
				duration: 340,
				easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
			});
		});
	}, [expandedServiceIds]);

	const toggleExpanded = (serviceId: number) => {
		prevRects.current = new Map([...groupRefs.current].map(([id, el]) => [id, el.getBoundingClientRect()]));
		onToggleExpanded(serviceId);
	};

	return (
		<div className="flex flex-wrap items-start gap-2">
			{groups.map((g) => {
				const expanded = expandedServiceIds.includes(g.serviceId);
				return (
					<div
						key={g.serviceId}
						ref={(el) => {
							if (el)
								groupRefs.current.set(g.serviceId, el);
							else
								groupRefs.current.delete(g.serviceId);
						}}
						className={`flex flex-wrap items-center gap-1.5 ${
							g.expandable
								? `p-1 rounded-[14px] border border-solid border-[var(--dash-border)] bg-[color-mix(in_srgb,var(--oo-colorFillQuaternary)_40%,transparent)] ${expanded ? "basis-full" : ""}`
								: ""
						}`}
					>
						{g.expandable && (
							<button
								type="button"
								onClick={() => toggleExpanded(g.serviceId)}
								title={t(`dashboard.widgets.monthlyPerformance.legend.${expanded ? "mergeTitle" : "splitTitle"}`)}
								className={`${BUTTON_RESET} flex items-center justify-center gap-1 h-[26px] w-[86px] shrink-0 rounded-full text-[11.5px] whitespace-nowrap text-primaryText hover:bg-colorFillQuaternary transition-colors`}
							>
								{expanded ? <RiFunctions className="text-[14px]" /> : <RiStackLine className="text-[14px]" />}
								{expanded
									? t("dashboard.widgets.monthlyPerformance.legend.merge")
									: t("dashboard.widgets.monthlyPerformance.legend.split", { n: formatCount(g.typeCount) })}
							</button>
						)}
						{g.series.map((s, chipIndex) => {
							const off = hiddenKeys.includes(s.key);
							const last = [...s.points].reverse().find(p => p.value !== null && p.value !== undefined);
							return (
								<button
									key={s.key}
									type="button"
									onClick={() => onToggleSeries(s.key)}
									title={t(`dashboard.widgets.monthlyPerformance.legend.${off ? "show" : "hide"}`)}
									className={`${BUTTON_RESET} dash-chip-in flex items-center gap-2 h-[28px] ps-2.5 pe-3 rounded-full border border-solid text-[12px] whitespace-nowrap transition-all hover:brightness-110`}
									style={{
										animationDelay: `${Math.min(chipIndex, 8) * 35}ms`,
										background: off ? "transparent" : "var(--oo-colorBgContainer)",
										borderColor: off ? "var(--dash-border)" : s.color,
										color: off ? "var(--oo-colorTextSecondary)" : "var(--oo-colorText)",
										opacity: off ? 0.6 : 1,
									}}
								>
									<span
										className="w-2.5 h-2.5 rounded-full transition-all"
										style={off ? { border: `2px solid ${s.color}` } : { background: s.color }}
									/>
									<span className={off ? "line-through decoration-colorTextTertiary" : ""}>{s.label}</span>
									<span className="text-[11px] text-colorTextTertiary tabular-nums">{last ? formatRialCompact(last.value) : "—"}</span>
								</button>
							);
						})}
					</div>
				);
			})}
		</div>
	);
}
