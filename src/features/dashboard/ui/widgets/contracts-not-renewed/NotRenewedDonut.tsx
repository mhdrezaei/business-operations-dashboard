import { formatCount } from "#src/features/dashboard/model/format";
import { useChartTheme } from "#src/features/dashboard/ui/charts/chart-theme";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart } from "recharts";

export interface NotRenewedSlice {
	key: string
	v: number
	c: string
	serviceId: number
	serviceName: string
}

interface NotRenewedDonutProps {
	total: number
	slices: NotRenewedSlice[]
	hoverKey: string | null
	setHoverKey: (key: string | null) => void
	/** undefined = all services. */
	onOpen: (slice?: NotRenewedSlice) => void
}

/** Companies per service; the total in the middle. Click on a slice / the total opens the list. */
export function NotRenewedDonut({ total, slices, hoverKey, setHoverKey, onOpen }: NotRenewedDonutProps) {
	const { t } = useTranslation();
	const T = useChartTheme();
	const hasData = slices.length > 0;
	const data = hasData ? slices : [{ key: "empty", v: 1, c: T.track }];

	return (
		<div className="relative shrink-0" dir="ltr" style={{ width: 140, height: 140 }}>
			<PieChart width={140} height={140}>
				<Pie
					data={data}
					dataKey="v"
					cx="50%"
					cy="50%"
					innerRadius={44}
					outerRadius={66}
					startAngle={90}
					endAngle={-270}
					stroke="none"
					paddingAngle={slices.length > 1 ? 1.5 : 0}
					animationDuration={900}
					animationEasing="ease-out"
					isAnimationActive
					onClick={(_, i) => hasData && onOpen(slices[i])}
					onMouseEnter={(_, i) => hasData && setHoverKey(slices[i].key)}
					onMouseLeave={() => setHoverKey(null)}
				>
					{data.map(d => (
						<Cell key={d.key} fill={d.c} fillOpacity={hoverKey && hoverKey !== d.key ? 0.3 : 1} style={{ cursor: hasData ? "pointer" : "default", transition: "fill-opacity .2s", outline: "none" }} />
					))}
				</Pie>
			</PieChart>
			<button
				type="button"
				onClick={() => onOpen()}
				disabled={!hasData}
				className="absolute inset-0 m-auto w-[88px] h-[88px] rounded-full flex flex-col items-center justify-center leading-tight bg-transparent border-0 p-0 font-[inherit] text-colorText enabled:cursor-pointer enabled:hover:bg-colorFillQuaternary transition-colors"
				aria-label={t("dashboard.widgets.notRenewed.openAll")}
			>
				<strong className="text-[22px] font-semibold tabular-nums">{formatCount(total)}</strong>
				<span className="text-[11px] text-colorTextTertiary">{t("dashboard.widgets.notRenewed.unit")}</span>
			</button>
		</div>
	);
}
