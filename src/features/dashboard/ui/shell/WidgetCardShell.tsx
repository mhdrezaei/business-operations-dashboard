import type { ReactNode } from "react";
import { Spin } from "antd";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { CARD_TRANSITION, useAnimatedCardSize } from "./animated-card-size";
import { AutoHeight } from "./AutoHeight";

interface WidgetCardShellProps {
	icon: ReactNode
	title: ReactNode
	description?: ReactNode
	headerExtra?: ReactNode
	children: ReactNode
	/** Previous data stays while refetching; it is dimmed with a spinner in the middle. */
	refreshing?: boolean
	/** Cards in the same row get the same height and the content fills the free space. */
	fill?: boolean
	/** With `fill`: animates the whole card height (see useAnimatedCardSize). */
	animateSize?: boolean
}

/** Shared frame of every dashboard card. */
export function WidgetCardShell({ icon, title, description, headerExtra, children, refreshing = false, fill = false, animateSize = false }: WidgetCardShellProps) {
	const { t } = useTranslation();
	const sectionRef = useRef<HTMLElement>(null);
	useAnimatedCardSize(sectionRef, fill && animateSize);

	const body = (
		<>
			<div className={`flex flex-col gap-3.5 transition-opacity duration-300 ${fill ? "flex-1" : ""}`} style={{ opacity: refreshing ? 0.5 : 1 }}>
				{children}
			</div>
			{refreshing && (
				<div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" role="status" aria-label={t("dashboard.common.loading")}>
					<span className="flex items-center justify-center w-11 h-11 rounded-full bg-colorBgElevated border border-solid border-colorBorder shadow-md">
						<Spin />
					</span>
				</div>
			)}
		</>
	);

	return (
		<section
			ref={sectionRef}
			className="flex flex-col gap-3.5 p-5 bg-colorBgContainer border border-solid border-colorBorder rounded-[14px] shadow-sm hover:border-primary hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
			style={{ transition: CARD_TRANSITION }}
		>
			<div className="flex items-start gap-3">
				<div className="grid place-items-center w-[38px] h-[38px] rounded-[11px] bg-primaryBg border border-solid border-colorBorder shrink-0 text-lg">
					{icon}
				</div>
				<div className="flex flex-col gap-0.5 flex-1 min-w-0">
					<h3 className="m-0 text-[15.5px] font-semibold text-colorText">{title}</h3>
					{description && <p className="m-0 text-[12.5px] text-colorTextSecondary">{description}</p>}
				</div>
				{headerExtra}
			</div>
			{fill
				? <div className="relative flex flex-col flex-1">{body}</div>
				: <AutoHeight>{body}</AutoHeight>}
		</section>
	);
}

/** Content placeholder while the first request of a card is in flight. */
export function WidgetSpinnerBox({ height = 200 }: { height?: number }) {
	const { t } = useTranslation();
	return (
		<div className="flex items-center justify-center w-full rounded-xl bg-colorFillQuaternary" style={{ height }} role="status" aria-label={t("dashboard.common.loading")}>
			<Spin size="large" />
		</div>
	);
}

export function WidgetError({ message }: { message?: string | null }) {
	const { t } = useTranslation();
	return (
		<div className="px-3.5 py-3 rounded-[11px] bg-errorBg border border-solid border-error text-[12.5px] text-error">
			{message || t("dashboard.common.widgetError")}
		</div>
	);
}

/** Neutral notice box (unavailable widget, empty list, no service selected, …). */
export function WidgetNotice({ children }: { children?: ReactNode }) {
	const { t } = useTranslation();
	return (
		<div className="px-3.5 py-3 rounded-[11px] bg-colorFillQuaternary border border-solid border-colorBorder text-[12.5px] text-colorTextSecondary">
			{children ?? t("dashboard.common.widgetUnavailable")}
		</div>
	);
}
