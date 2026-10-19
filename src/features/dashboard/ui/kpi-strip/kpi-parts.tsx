import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type { KpiTone } from "./kpi-tones";
import type { PhIconName } from "./PhIcon";
import { scrollToAnchor } from "#src/features/dashboard/model/navigation";

import { useKpiTones } from "./kpi-tones";
import { PhIcon } from "./PhIcon";

/** Frame of the three KPI panels. */
export const PANEL = "flex-1 min-w-0 flex flex-col bg-colorBgContainer border border-solid border-[var(--dash-border)] rounded-[14px]";

interface PanelHeaderProps {
	icon: PhIconName
	tone: KpiTone
	title: ReactNode
	subtitle: ReactNode
	children?: ReactNode
}

export function PanelHeader({ icon, tone, title, subtitle, children }: PanelHeaderProps) {
	const tones = useKpiTones();
	return (
		<div className="flex flex-wrap items-center gap-2.5 px-[18px] py-3.5">
			<span className="grid place-items-center w-8 h-8 rounded-[9px] shrink-0" style={{ background: tones[tone].soft, color: tones[tone].color }}>
				<PhIcon name={icon} className="text-base" />
			</span>
			<span className="flex flex-col leading-[1.4]">
				<span className="text-[14.5px] font-semibold text-colorText">{title}</span>
				<span className="text-[12px] text-colorTextTertiary">{subtitle}</span>
			</span>
			{children}
		</div>
	);
}

interface CardLinkProps {
	anchor: string
	onActivate?: () => void
	className: string
	style?: CSSProperties
	children: ReactNode
}

/** Card linking to its dashboard section (smooth scroll below the sticky header). */
export function CardLink({ anchor, onActivate, className, style, children }: CardLinkProps) {
	return (
		<a
			href={`#${anchor}`}
			onClick={(e: MouseEvent<HTMLAnchorElement>) => {
				onActivate?.();
				scrollToAnchor(e, anchor);
			}}
			className={`no-underline hover:text-colorText ${className}`}
			style={style}
		>
			{children}
		</a>
	);
}
