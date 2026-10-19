import type { KpiMotion } from "./kpi-motion";
import type { PhIconName } from "./PhIcon";
import type { KpiTiles } from "./use-kpi-data";
import { formatCount, formatNumber } from "#src/features/dashboard/model/format";
import { RATE_TARGET } from "#src/features/dashboard/ui/charts/RateGauge";
import { useTranslation } from "react-i18next";

import { enterStyle, HOVER_LIFT, roll, settle } from "./kpi-motion";
import { CardLink, PANEL, PanelHeader } from "./kpi-parts";
import { useKpiTones } from "./kpi-tones";
import { PhIcon } from "./PhIcon";

interface ActionRow {
	label: string
	sub: string
	icon: PhIconName
	value: number | null
	unit?: string
	/** Percent target: draws the progress bar with a target marker. */
	target?: number
	tone?: "warn"
	valueTone?: "warn"
	anchor: string
}

/** "Needs action" panel: rows linking to the registration-rate, unregistered and expiring cards. */
interface ActionPanelProps {
	tiles: KpiTiles
	motion: KpiMotion
	/** Tiles or counters still in flight. */
	pending: boolean
}

export function ActionPanel({ tiles, motion, pending }: ActionPanelProps) {
	const { t } = useTranslation();
	const tones = useKpiTones();
	const { p, pn, shown, rolling } = motion;
	const { rate } = tiles;

	const actions: ActionRow[] = [
		{
			label: t("dashboard.kpi.actions.rate"),
			sub: pending
				? ""
				: rate.percentage === null
					? t("dashboard.kpi.actions.noData")
					: t("dashboard.kpi.actions.rateSub", {
						registered: formatCount(rate.registered),
						total: formatCount(rate.total),
						month: tiles.monthLabel,
						target: formatNumber(RATE_TARGET),
					}),
			icon: "clipboard-text",
			value: rate.percentage,
			unit: "٪",
			target: RATE_TARGET,
			anchor: "registered-performance-rate",
		},
		{
			label: t("dashboard.kpi.actions.unregistered"),
			sub: tiles.unregistered.topService ? t("dashboard.kpi.actions.topService", { name: tiles.unregistered.topService }) : "",
			icon: "warning",
			value: tiles.unregistered.total,
			tone: "warn",
			anchor: "unregistered-performances",
		},
		{
			label: t("dashboard.kpi.actions.expiring"),
			sub: tiles.expiring.peakLabel ? t("dashboard.kpi.actions.peak", { month: tiles.expiring.peakLabel }) : "",
			icon: "clock-countdown",
			value: tiles.expiring.total,
			tone: "warn",
			valueTone: "warn",
			anchor: "contracts-expiring",
		},
	];

	return (
		<div className="flex flex-[1_1_340px] min-w-0" style={enterStyle(shown, 400, 12)}>
			<section className={PANEL}>
				<PanelHeader
					icon="bell-ringing"
					tone="warn"
					title={t("dashboard.kpi.actions.title")}
					subtitle={t("dashboard.common.itemsCount", { value: formatNumber(actions.length) })}
				/>
				<div className="flex flex-col gap-2 px-4 pb-4">
					{actions.map((a, i) => {
						const hasBar = a.target != null && a.value !== null;
						const below = a.target != null && a.value !== null && a.value < a.target;
						const color = below ? tones.danger.color : a.tone === "warn" ? tones.warn.color : tones.ok.color;
						const valueColor = below ? tones.danger.color : a.valueTone === "warn" ? tones.warn.color : tones.text;
						return (
							<div key={a.anchor} className="flex" style={enterStyle(shown, (i + 4) * 80, 10)}>
								<CardLink
									anchor={a.anchor}
									className={`flex-1 min-w-0 flex flex-col gap-2 p-3 rounded-[10px] bg-colorFillQuaternary border border-solid border-[var(--dash-border)] text-colorText cursor-pointer ${HOVER_LIFT} hover:-translate-x-[3px] hover:bg-colorFillTertiary hover:border-primary hover:shadow-md active:-translate-x-px`}
								>
									<span className="flex items-center gap-2.5">
										<PhIcon name={a.icon} className="text-lg" style={{ color }} />
										<span className="flex-1 min-w-0 flex flex-col leading-[1.35]">
											<span className="text-[13px]">{a.label}</span>
											{a.sub && <span className="text-[11.5px] text-colorTextTertiary">{a.sub}</span>}
										</span>
										<strong className="text-xl font-semibold tabular-nums" style={{ color: valueColor }}>
											<span>{rolling ? `${roll(2)}${a.unit ?? ""}` : a.value === null ? "—" : `${settle(a.value, pn)}${a.unit ?? ""}`}</span>
										</strong>
										<PhIcon name="caret-left" className="text-[13px] text-colorTextTertiary" />
									</span>
									{hasBar && (
										<span className="relative block h-[5px] rounded-full bg-colorFillSecondary">
											<span className="absolute inset-y-0 start-0 rounded-full" style={{ width: `${(a.value || 0) * p}%`, background: color }} />
											<span className="absolute -top-[3px] -bottom-[3px] w-0.5 rounded-[1px]" style={{ insetInlineStart: `${a.target}%`, background: tones.ok.color }} />
										</span>
									)}
								</CardLink>
							</div>
						);
					})}
				</div>
			</section>
		</div>
	);
}
