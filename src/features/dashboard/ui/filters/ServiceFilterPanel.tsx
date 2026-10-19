// Global service filter ("Services Dock", vertical). On wide screens it is fixed inside the empty gutter on the left
// of the cards (card widths never change and it stays with the user while scrolling); on smaller screens there is no
// gutter and it sits above the cards. Collapsed, it shows only the summary and status dots; hover/focus/click opens it
// downwards and every service toggles with one click. Portaled to body because the dash-rise-in animation of the
// parents creates a containing block for fixed elements. An empty value means "all services".
import type { DashboardService } from "#src/features/dashboard/model/types";
import type { FocusEvent, ReactNode, RefObject } from "react";
import { formatCount } from "#src/features/dashboard/model/format";
import { useUpdateEffect } from "ahooks";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import {
	RiBankCardLine,
	RiBankLine,
	RiBarChartBoxLine,
	RiBriefcaseLine,
	RiBuilding2Line,
	RiChat3Line,
	RiCheckDoubleLine,
	RiCheckLine,
	RiEraserLine,
	RiFilter3Line,
	RiIdCardLine,
	RiMessage2Line,
	RiPushpinFill,
	RiPushpinLine,
	RiSignalTowerLine,
	RiStackLine,
	RiStore2Line,
} from "../icons";
import { FILTER_ANCHOR_ID, floatingArea, GLASS_PANEL, PANEL_GAP, PANEL_WIDTH, placePanel, useFloatingTracking } from "./floating-panel";

export { FILTER_ANCHOR_ID };

/** Smallest distance of the panel from the edge of the scroll area. */
const EDGE_MIN = 8;
/** Skips the section title so the panel is aligned with the top of the cards. */
const ANCHOR_OFFSET = 38;
const EASE = "cubic-bezier(.2,.8,.2,1)";
const CLOSE_DELAY = 350;
const PEEK_DELAY = 700;
const PEEK_DURATION = 1600;
const BUTTON = "bg-transparent border-0 p-0 font-[inherit] cursor-pointer";

type IconComponent = typeof RiStackLine;

// Icon by service name; order matters (sales agency before agency SMS before SMS).
const ICON_RULES: [RegExp, IconComponent][] = [
	[/عاملیت\s*فروش/, RiStore2Line],
	[/پیامک.*عاملیت|عاملیت.*پیامک/, RiChat3Line],
	[/پیامک|sms/i, RiMessage2Line],
	[/api|مالی/i, RiBankLine],
	[/psp/i, RiBankCardLine],
	[/شاهکار/, RiIdCardLine],
	[/تجاری/, RiBriefcaseLine],
	[/\bcp\b/i, RiBuilding2Line],
	[/مخابرات|فریم/, RiSignalTowerLine],
	[/ترافیک/, RiBarChartBoxLine],
];
// The "سرویس / سرویس‌های" prefix is dropped only in this filter's display (id and original name stay untouched).
const SERVICE_PREFIX = /^\s*سرویس(?:[\s\u200C]*های)?[\s\u200C]+/;
const displayName = (name: string) => name.replace(SERVICE_PREFIX, "").trim() || name;
const iconFor = (name: string) => ICON_RULES.find(([re]) => re.test(name))?.[1] ?? RiStackLine;

/**
 * Horizontal position of the panel: left edge of the cards minus the panel width and gap; null = no room in the left
 * gutter (the panel sits above the cards). Measured from the real gutter instead of a fixed breakpoint. The top is
 * aligned with the cards and sticks below the top of the scroll area; it is written to the DOM directly.
 */
function useSidePlacement(panelRef: RefObject<HTMLElement>) {
	const [left, setLeft] = useState<number | null>(null);
	const topRef = useRef(0);

	useFloatingTracking(() => {
		const el = document.getElementById(FILTER_ANCHOR_ID);
		if (!el) {
			setLeft(null);
			return;
		}
		const area = floatingArea(el);
		const rect = el.getBoundingClientRect();
		const next = rect.left - PANEL_GAP - PANEL_WIDTH;
		const value = next - area.left >= EDGE_MIN ? Math.round(next) : null;
		setLeft(value);
		if (value === null)
			return;
		const top = Math.max(area.stickyTop, rect.top + ANCHOR_OFFSET);
		topRef.current = top;
		placePanel(panelRef.current, top, area.top);
	});

	return { left, top: topRef.current };
}

// Distance from the row under the mouse (Services Dock): the row itself grows a bit, its two neighbours much less.
const hoverScale = (d: number) => (d === 0 ? 1.06 : d === 1 ? 1.025 : 1);

interface ServiceRowProps {
	Icon: IconComponent
	on: boolean
	onClick: () => void
	children: ReactNode
	strong?: boolean
	dist?: number
	onEnter: () => void
}

function ServiceRow({ Icon, on, onClick, children, strong = false, dist = 9, onEnter }: ServiceRowProps) {
	// The "pop" plays only after a real change of `on`, not on the first mount.
	const [pop, setPop] = useState(0);
	useUpdateEffect(() => setPop(p => p + 1), [on]);
	return (
		<button
			type="button"
			onClick={onClick}
			onMouseEnter={onEnter}
			onFocus={onEnter}
			aria-pressed={on}
			className={`${BUTTON} flex items-center gap-2 w-full px-1.5 py-1 rounded-[10px] text-start text-[12.5px] leading-[19px] hover:bg-colorFillQuaternary transition-[background-color,color,transform] duration-200 will-change-transform ${on ? "text-colorText" : "text-colorTextSecondary"}`}
			style={{
				fontWeight: strong ? 600 : 400,
				transform: dist < 2 ? `scale(${hoverScale(dist)})` : "none",
				transitionTimingFunction: EASE,
			}}
		>
			<span
				key={pop}
				className={`relative grid place-items-center w-[28px] h-[28px] rounded-[9px] shrink-0 text-base transition-[background,color,box-shadow] duration-200 ${on ? "bg-primaryBg text-primaryText" : "bg-transparent text-colorTextTertiary"} ${pop > 0 ? "dash-svc-pop" : ""}`}
				style={{ boxShadow: on ? "inset 0 0 0 1px color-mix(in srgb, var(--oo-colorPrimaryText) 28%, transparent)" : "none" }}
			>
				<Icon />
			</span>
			<span className="min-w-0 flex-1 break-words">{children}</span>
			<span
				className="shrink-0 grid place-items-center w-3 h-3 text-xs transition-[transform,opacity] duration-200"
				style={{ opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(.4)", transitionTimingFunction: EASE }}
			>
				<RiCheckLine key={on ? "on" : "off"} className={`text-primaryText ${on && pop > 0 ? "dash-svc-check-in" : ""}`} />
			</span>
		</button>
	);
}

interface ServiceFilterPanelProps {
	services: DashboardService[]
	value: number[]
	onChange: (ids: number[]) => void
	none: boolean
	onNoneChange: (none: boolean) => void
}

export function ServiceFilterPanel({ services, value, onChange, none, onNoneChange }: ServiceFilterPanelProps) {
	const { t } = useTranslation();
	const groupRef = useRef<HTMLElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const { left: sideLeft, top } = useSidePlacement(groupRef);
	const wide = sideLeft !== null;
	const [open, setOpen] = useState(!wide); // open by default on small screens (there is room)
	const [pinned, setPinned] = useState(false);
	const [hoverIdx, setHoverIdx] = useState(-1); // 0 = "all services", i+1 = service i
	const inside = useRef(false);
	const timer = useRef<ReturnType<typeof setTimeout>>();
	const pinnedRef = useRef(false);
	pinnedRef.current = pinned;

	const options = useMemo(() => services.map(s => ({ id: s.id, name: displayName(s.name), Icon: iconFor(s.name) })), [services]);
	const allSelected = !none && (value.length === 0 || (options.length > 0 && value.length >= options.length));
	const isOn = (id: number) => !none && (allSelected || value.includes(id));
	const selectedCount = none ? 0 : allSelected ? options.length : value.length;

	const toggle = (id: number) => {
		const current = none ? [] : allSelected ? options.map(o => o.id) : value;
		const next = current.includes(id) ? current.filter(i => i !== id) : [...current, id];
		if (next.length === 0) {
			onNoneChange(true); // value is left untouched so the cards do not refetch/reset
			return;
		}
		onNoneChange(false);
		onChange(next.length >= options.length ? [] : next);
	};

	// Clicking "all" while everything is selected clears the selection (value unchanged).
	const toggleAll = () => {
		if (allSelected) {
			onNoneChange(true);
			return;
		}
		onChange([]);
		onNoneChange(false);
	};

	const scheduleClose = useCallback((ms: number) => {
		clearTimeout(timer.current);
		timer.current = setTimeout(() => {
			if (!inside.current && !pinnedRef.current)
				setOpen(false);
		}, ms);
	}, []);

	// Hover/Esc/outside-tap only in the floating (wide) mode; on small screens only the click opens/closes.
	useEffect(() => {
		if (!wide) {
			setOpen(true);
			return undefined;
		}
		setOpen(false);
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !pinnedRef.current)
				setOpen(false);
		};
		const onOutside = (e: PointerEvent) => {
			if (!pinnedRef.current && !groupRef.current?.contains(e.target as Node)) {
				inside.current = false;
				setOpen(false);
			}
		};
		document.addEventListener("keydown", onKey);
		document.addEventListener("pointerdown", onOutside);
		// A short "peek" so the user notices the filter.
		const peek = setTimeout(() => {
			setOpen(true);
			scheduleClose(PEEK_DURATION);
		}, PEEK_DELAY);
		return () => {
			clearTimeout(peek);
			clearTimeout(timer.current);
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("pointerdown", onOutside);
		};
	}, [wide, scheduleClose]);

	// React 18 has no typed `inert` prop.
	useLayoutEffect(() => {
		if (listRef.current)
			listRef.current.inert = !open;
	}, [open]);

	const summary = allSelected
		? t("dashboard.filters.services.all")
		: selectedCount === 0
			? t("dashboard.filters.services.none")
			: t("dashboard.filters.services.selected", { selected: formatCount(selectedCount), total: formatCount(options.length) });

	const enter = () => {
		inside.current = true;
		clearTimeout(timer.current);
		setOpen(true);
	};
	const leave = () => {
		inside.current = false;
		scheduleClose(CLOSE_DELAY);
	};
	const hoverProps = wide
		? {
			onMouseEnter: enter,
			onFocus: enter,
			onMouseLeave: leave,
			onBlur: (e: FocusEvent<HTMLElement>) => {
				if (!e.currentTarget.contains(e.relatedTarget))
					leave();
			},
		}
		: {};

	const panel = (
		<aside
			ref={groupRef}
			dir="rtl"
			aria-label={t("dashboard.filters.services.ariaLabel")}
			style={wide ? { top, left: sideLeft } : undefined}
			className={`${wide ? "fixed z-30 w-[172px]" : "w-full"} p-1.5 flex flex-col ${GLASS_PANEL} ${open && wide ? "border-primary" : "border-colorBorder"}`}
			{...hoverProps}
		>
			<div className="flex items-center">
				<button
					type="button"
					onClick={() => setOpen(o => (wide && pinned ? true : !o))}
					aria-expanded={open}
					className={`${BUTTON} flex-1 min-w-0 flex items-center gap-2 h-11 ps-2 pe-1.5 rounded-[11px] text-colorText hover:bg-colorFillQuaternary transition-colors text-start`}
				>
					<span className="grid place-items-center w-[28px] h-[28px] rounded-[9px] text-white text-[15px] shrink-0 bg-gradient-to-br from-primary to-primaryActive shadow-md">
						<RiFilter3Line />
					</span>
					<span className="flex flex-col items-start leading-tight min-w-0">
						<span className="text-[12.5px] font-semibold whitespace-nowrap">{summary}</span>
						<span className="flex flex-wrap gap-[3px] mt-1" aria-hidden="true">
							{options.map(o => (
								<span
									key={o.id}
									className={`w-1.5 h-1.5 rounded-[2px] transition-colors duration-200 ${isOn(o.id) ? "bg-primaryText" : "bg-colorBorder"}`}
								/>
							))}
						</span>
					</span>
				</button>
				{wide && (
					<button
						type="button"
						onClick={() => setPinned(p => !p)}
						aria-label={t(pinned ? "dashboard.filters.services.unpin" : "dashboard.filters.services.pin")}
						aria-pressed={pinned}
						className={`${BUTTON} shrink-0 grid place-items-center w-7 h-11 rounded-[10px] text-[15px] hover:bg-colorFillQuaternary transition-colors ${pinned ? "text-primaryText" : "text-colorTextTertiary"}`}
					>
						{pinned ? <RiPushpinFill /> : <RiPushpinLine />}
					</button>
				)}
			</div>

			<div
				className="grid"
				style={{ gridTemplateRows: open ? "1fr" : "0fr", transition: `grid-template-rows .45s ${EASE}` }}
			>
				<div className="min-h-0 overflow-hidden">
					<div
						ref={listRef}
						className="flex flex-col gap-0.5 pt-1"
						style={{
							opacity: open ? 1 : 0,
							transform: open ? "none" : "translateY(-8px)",
							transition: `opacity .3s ease ${open ? ".1s" : "0s"}, transform .45s ${EASE}`,
						}}
					>
						<span className="h-px mx-1.5 bg-colorFillSecondary" />
						<div
							onMouseLeave={() => setHoverIdx(-1)}
							className="flex flex-col gap-0.5 max-h-[calc(100vh-260px)] overflow-y-auto overflow-x-hidden px-2 py-1 [scrollbar-gutter:stable] dash-scroll"
						>
							<ServiceRow
								Icon={allSelected ? RiEraserLine : RiCheckDoubleLine}
								on={allSelected}
								onClick={toggleAll}
								strong
								dist={hoverIdx < 0 ? 9 : Math.abs(hoverIdx)}
								onEnter={() => setHoverIdx(0)}
							>
								{allSelected ? t("dashboard.filters.services.clearAll") : t("dashboard.filters.services.all")}
							</ServiceRow>
							{options.map((o, i) => (
								<ServiceRow
									key={o.id}
									Icon={o.Icon}
									on={isOn(o.id)}
									onClick={() => toggle(o.id)}
									dist={hoverIdx < 0 ? 9 : Math.abs(i + 1 - hoverIdx)}
									onEnter={() => setHoverIdx(i + 1)}
								>
									{o.name}
								</ServiceRow>
							))}
						</div>
					</div>
				</div>
			</div>
		</aside>
	);
	return wide ? createPortal(panel, document.body) : panel;
}
