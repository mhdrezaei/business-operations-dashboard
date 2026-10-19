import { getScrollContainer, STICKY_GAP } from "#src/features/dashboard/model/navigation";
import { useEffect, useRef } from "react";

/** Section wrapping the KPI strip and every card: the floating panels are placed around it. */
export const FILTER_ANCHOR_ID = "dashboard-widgets-section";
/** Width of the floating filter panels and their gap to the cards. */
export const PANEL_WIDTH = 172;
export const PANEL_GAP = 12;
/** How long positions are re-measured every frame after a layout transition starts (sidebar collapse). */
const TRANSITION_TRACK_MS = 500;

/** Glass card of the floating filter panels (the border color is set by each panel). */
export const GLASS_PANEL = "rounded-[14px] border border-solid bg-[color-mix(in_srgb,var(--oo-colorBgContainer)_42%,transparent)] backdrop-blur-[22px] backdrop-saturate-[1.8] shadow-md transition-[border-color] duration-300";

/**
 * Viewport box the floating panels may use: the layout's scroll area (falls back to the window).
 * `stickyTop` is where a panel sticks while scrolling.
 */
export function floatingArea(anchor: Element) {
	const rect = getScrollContainer(anchor)?.getBoundingClientRect();
	return {
		top: rect?.top ?? 0,
		stickyTop: (rect?.top ?? 0) + STICKY_GAP,
		left: rect?.left ?? 0,
		right: rect?.right ?? window.innerWidth,
	};
}

/**
 * Moves a fixed panel to `top`. The part above the scroll area is clipped, so a panel leaving with its anchor slides
 * under the layout header and tab bar (as under the old sticky header) instead of covering them.
 */
export function placePanel(panel: HTMLElement | null, top: number, areaTop: number) {
	if (!panel)
		return;
	panel.style.top = `${top}px`;
	const hidden = Math.max(0, areaTop - top);
	panel.style.clipPath = hidden > 0 ? `inset(${hidden}px 0 0 0)` : "";
}

/**
 * Re-runs `update` whenever the anchors may have moved. Scroll is handled synchronously (capture on window catches
 * the inner scroll container) so a panel moves in the same frame as the page; everything else is batched with rAF.
 * The collapsing sidebar shifts the content with a transition (no scroll/resize, anchor size unchanged), so after a
 * `transitionrun` positions are measured every frame for a while. The page scrolls inside the layout (the body never
 * resizes), so the widgets section is observed: lazily mounted cards and the KPI strip change its size.
 */
export function useFloatingTracking(update: () => void, anchorIds: readonly string[] = []) {
	const updateRef = useRef(update);
	updateRef.current = update;
	const ids = [FILTER_ANCHOR_ID, ...anchorIds].join(" ");

	useEffect(() => {
		let raf = 0;
		let trackUntil = 0;
		const run = () => {
			raf = 0;
			updateRef.current();
		};
		const schedule = () => {
			if (!raf)
				raf = requestAnimationFrame(run);
		};
		const onScroll = () => updateRef.current();
		const track = () => {
			updateRef.current();
			raf = performance.now() < trackUntil ? requestAnimationFrame(track) : 0;
		};
		const onTransition = () => {
			const running = trackUntil > performance.now();
			trackUntil = performance.now() + TRANSITION_TRACK_MS;
			if (!running) {
				if (raf)
					cancelAnimationFrame(raf);
				raf = requestAnimationFrame(track);
			}
		};

		updateRef.current();
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", schedule);
		const ro = new ResizeObserver(schedule);
		ids.split(" ").forEach((id) => {
			const el = document.getElementById(id);
			if (el)
				ro.observe(el);
		});
		document.addEventListener("transitionrun", onTransition, true);
		document.addEventListener("transitionend", schedule, true);
		return () => {
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", schedule);
			document.removeEventListener("transitionrun", onTransition, true);
			document.removeEventListener("transitionend", schedule, true);
			ro.disconnect();
			if (raf)
				cancelAnimationFrame(raf);
		};
	}, [ids]);
}
