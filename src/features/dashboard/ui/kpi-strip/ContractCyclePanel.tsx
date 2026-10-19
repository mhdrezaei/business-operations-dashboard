import type { HomeDashboardResponse, KpiListKey } from "#src/features/dashboard/api/dashboard.dto";
import type { KpiMotion } from "./kpi-motion";
import type { KpiListTarget } from "./KpiListModal";
import type { PhIconName } from "./PhIcon";
import type { KpiTiles } from "./use-kpi-data";
import { formatNumber, toNum } from "#src/features/dashboard/model/format";
import { useTranslation } from "react-i18next";

import { chainProgress, enterStyle, HOVER_LIFT, RING_LEN, roll, settle } from "./kpi-motion";
import { PANEL, PanelHeader } from "./kpi-parts";
import { useKpiTones } from "./kpi-tones";
import { PhIcon } from "./PhIcon";

type CounterKey = keyof HomeDashboardResponse;

interface StageDef {
	key: CounterKey
	labelKey: string
	icon: PhIconName
	noteKey?: string
	/** Final stage (green). */
	done?: boolean
	/** GET /home/widgets/<listKey>/ lists the records behind the number (opened in KpiListModal). */
	listKey: KpiListKey
}

// «تایید اداره قراردادها» is `is_signed`; the word «امضا» is never used for it.
const STAGE_DEFS: StageDef[] = [
	{ key: "pending_business_approval_count", labelKey: "dashboard.approval.stages.pending_business_approval", icon: "hourglass-medium", listKey: "list-stage-pending-business-approval" },
	{ key: "pending_sign_approval_count", labelKey: "dashboard.approval.stages.pending_sign_approval", icon: "briefcase", listKey: "list-stage-pending-sign-approval" },
	{ key: "approved_not_in_sign_flow_count", labelKey: "dashboard.kpi.cycle.approvedNotInSignFlow", icon: "seal-check", noteKey: "dashboard.kpi.cycle.approvedNotInSignFlowNote", listKey: "list-stage-approved-not-in-sign-flow" },
	{ key: "real_sign_in_progress_count", labelKey: "dashboard.approval.realSign.in_progress", icon: "signature", listKey: "list-stage-sign-in-progress" },
	{ key: "real_signed_count", labelKey: "dashboard.kpi.cycle.signed", icon: "check", done: true, listKey: "list-stage-signed" },
];

interface ContractCyclePanelProps {
	tiles: KpiTiles
	dashboard: Partial<HomeDashboardResponse> | null
	motion: KpiMotion
	/** Linear time of the ring → line → ring chain. */
	chainQ: number
	deniedKeys: Set<KpiListKey>
	onOpenList: (target: KpiListTarget) => void
}

/** "Contract cycle" panel: from business approval to the signature in the system; every number opens its list. */
export function ContractCyclePanel({ tiles, dashboard, motion, chainQ, deniedKeys, onOpenList }: ContractCyclePanelProps) {
	const { t } = useTranslation();
	const tones = useKpiTones();
	const { pn, shown, rolling } = motion;

	const stages = STAGE_DEFS.flatMap((d) => {
		const value = dashboard && d.key in dashboard ? toNum(dashboard[d.key]) : null;
		return value === null ? [] : [{ ...d, label: t(d.labelKey), value }];
	});
	const n = stages.length;
	if (n === 0)
		return null;
	const stageTotal = stages.reduce((a, s) => a + s.value, 0) || 1;
	const maxIdx = stages.reduce((m, s, i, arr) => (s.value > arr[m].value ? i : m), 0);
	const chain = chainProgress(chainQ, n);

	const summary = ([
		{ label: t("dashboard.kpi.cycle.companies"), icon: "buildings", value: dashboard ? toNum(dashboard.total_companies_count) : null, listKey: "list-companies" },
		// Base contracts + addenda from contracts-approval-status; equals the count of list-all-contracts.
		{ label: t("dashboard.kpi.cycle.contracts"), icon: "files", value: tiles.approval.total, listKey: "list-all-contracts" },
		{ label: t("dashboard.kpi.cycle.activeContracts"), icon: "check-square", value: dashboard ? toNum(dashboard.active_contracts_count) : null, listKey: "list-active-contracts" },
	] satisfies { label: string, icon: PhIconName, value: number | null, listKey: KpiListKey }[]).flatMap(s => (s.value === null ? [] : [{ ...s, value: s.value }]));

	const toneOf = (k: number) => (k === maxIdx && !stages[k].done ? tones.warn.color : stages[k].done ? tones.ok.color : tones.neutral);
	const openList = (listKey: KpiListKey, label: string) => onOpenList({ key: listKey, title: t("dashboard.kpi.cycle.listTitle", { label }) });

	return (
		<div className="flex flex-[2_1_660px] min-w-0" style={enterStyle(shown, 250, 12)}>
			<section className={PANEL}>
				<PanelHeader icon="file-text" tone="link" title={t("dashboard.kpi.cycle.title")} subtitle={t("dashboard.kpi.cycle.subtitle")}>
					<span className="ms-auto flex flex-wrap gap-2">
						{summary.map(s => (
							<button
								key={s.listKey}
								type="button"
								disabled={rolling || deniedKeys.has(s.listKey)}
								onClick={() => openList(s.listKey, s.label)}
								className="flex items-center gap-2 px-3.5 py-[7px] rounded-[10px] font-[inherit] bg-colorFillQuaternary border border-solid border-[var(--dash-border)] text-colorTextSecondary whitespace-nowrap enabled:cursor-pointer transition-[background-color,border-color,transform] duration-200 enabled:hover:bg-colorFillTertiary enabled:hover:border-primary enabled:hover:-translate-y-px motion-reduce:transition-none"
							>
								<PhIcon name={s.icon} className="text-[17px] text-primaryText" />
								<b className="text-[18px] font-semibold leading-none text-colorText tabular-nums">{rolling ? roll(3) : settle(s.value, pn)}</b>
								<span className="text-[13px]">{s.label}</span>
							</button>
						))}
					</span>
				</PanelHeader>
				<div className="relative grid px-4 pt-1 pb-4" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
					{/* Lines between the circles: each runs exactly from the edge of one circle to the edge of the next (19px = circle radius). */}
					{stages.slice(0, -1).map((st, i) => (
						<span
							key={`seg-${st.key}`}
							aria-hidden="true"
							className="absolute top-[35px] h-0.5 bg-colorFillSecondary overflow-hidden"
							style={{
								insetInlineStart: `calc(16px + (100% - 32px) * ${(i + 0.5) / n} + 19px)`,
								width: `calc((100% - 32px) / ${n} - 38px)`,
							}}
						>
							<span
								className="absolute inset-y-0 start-0"
								style={{
									width: `${chain.seg[i] * 100}%`,
									background: `linear-gradient(270deg, ${toneOf(i)}, ${toneOf(i + 1)})`,
								}}
							/>
						</span>
					))}
					{stages.map((s, i) => {
						const hot = i === maxIdx && !s.done;
						const tone = hot ? tones.warn : s.done ? tones.ok : null;
						const note = rolling
							? undefined
							: hot
								? t("dashboard.kpi.cycle.hotShare", { value: formatNumber(Math.round((s.value / stageTotal) * 100)) })
								: s.noteKey && t(s.noteKey);
						const ringDone = chain.ring[i] >= 1;
						return (
							<div key={s.key} className="flex" style={enterStyle(shown, (i + 2) * 80, 10)}>
								<button
									type="button"
									disabled={rolling || deniedKeys.has(s.listKey)}
									onClick={() => openList(s.listKey, s.label)}
									className={`relative flex-1 min-w-0 flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-0 bg-transparent font-[inherit] text-center text-colorText enabled:cursor-pointer ${HOVER_LIFT} enabled:hover:-translate-y-[3px] enabled:hover:bg-[color-mix(in_srgb,var(--oo-colorFillQuaternary)_35%,transparent)] enabled:hover:backdrop-blur-[2px] ![transition-property:transform,border-color,box-shadow,background-color,backdrop-filter] enabled:active:-translate-y-px`}
								>
									<span
										className={`relative grid place-items-center w-[38px] h-[38px] rounded-full border-2 border-solid border-[var(--dash-border)] box-border ${tone ? "" : "bg-colorFillQuaternary"}`}
										style={{
											// Opaque tint on the panel surface so the connecting line does not show under the circle.
											background: tone ? tone.soft : undefined,
											color: ringDone ? tone?.color ?? tones.muted : tones.muted,
											transition: "color .4s ease",
										}}
									>
										{/* The perimeter fills clockwise from the top (r = 18 = the middle of the 2px border). */}
										<svg viewBox="0 0 38 38" width="38" height="38" aria-hidden="true" className="absolute -inset-0.5" style={{ transform: "rotate(-90deg)" }}>
											<circle
												cx="19"
												cy="19"
												r="18"
												fill="none"
												strokeWidth="2"
												strokeDasharray={RING_LEN}
												strokeDashoffset={RING_LEN * (1 - chain.ring[i])}
												style={{ stroke: tone?.color ?? (ringDone ? tones.neutral : tones.link.color), transition: "stroke .4s ease" }}
											/>
										</svg>
										<PhIcon name={s.icon} className="relative text-[18px]" />
									</span>
									<strong className="text-[28px] font-semibold leading-[1.2] tabular-nums" style={{ color: tone?.color ?? tones.text }}>
										<span>{rolling ? roll(2) : settle(s.value, pn)}</span>
									</strong>
									<span className="text-[12.5px] text-colorTextSecondary">{s.label}</span>
									{note && (
										<span
											className="text-[11px] leading-snug px-2 py-0.5 rounded-xl"
											style={{ background: hot ? tones.warn.soft : "transparent", color: hot ? tones.warn.color : tones.faint }}
										>
											{note}
										</span>
									)}
								</button>
							</div>
						);
					})}
				</div>
			</section>
		</div>
	);
}
