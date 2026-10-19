import type { LegendItem, StackModel } from "./company-financials.model";
import { useTranslation } from "react-i18next";
import { StackBar } from "./StackBar";

interface ConcentrationPanelProps {
	stacks: StackModel[]
	legend: LegendItem[]
	hover: string | null
	setHover: (key: string | null) => void
}

/** Income/expense concentration: two stacked bars from the response `chart`, plus the shared legend. */
export function ConcentrationPanel({ stacks, legend, hover, setHover }: ConcentrationPanelProps) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-3 px-4 py-3.5 rounded-xl bg-colorFillQuaternary border border-solid border-[var(--dash-border)]" onMouseLeave={() => setHover(null)}>
			<div className="flex items-center gap-2 flex-wrap">
				<span className="text-[13.5px] font-semibold whitespace-nowrap">{t("dashboard.widgets.companyFinancials.concentration")}</span>
				<span className="text-[12px] text-colorTextTertiary">{t("dashboard.widgets.companyFinancials.concentrationHint")}</span>
			</div>
			{stacks.map(st => (
				<div key={st.key} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3">
					<span className="text-[12.5px] text-colorTextSecondary">{t(`dashboard.metrics.${st.key}`)}</span>
					<StackBar segs={st.segs} hover={hover} setHover={setHover} />
				</div>
			))}
			<div className="flex flex-wrap gap-1.5 sm:ps-[68px]">
				{legend.map(lg => (
					<span
						key={lg.key}
						onMouseEnter={() => setHover(lg.key)}
						className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full bg-colorBgContainer border border-solid text-[12px] whitespace-nowrap text-colorTextSecondary cursor-default transition-[opacity,border-color] duration-200 ${hover === lg.key ? "border-primary" : "border-[var(--dash-border)]"}`}
						style={{ opacity: hover == null || hover === lg.key ? 1 : 0.4 }}
					>
						<span className="w-2 h-2 rounded-[2px]" style={{ background: lg.color }} />
						{lg.name}
					</span>
				))}
			</div>
		</div>
	);
}
