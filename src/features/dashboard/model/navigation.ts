import type { FinancialMetric } from "#src/features/dashboard/api/dashboard.dto";

export function prefersReducedMotion() {
	return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Selects the metric of the monthly-performance card from outside (KPI strip income/expense/profit cards). */
export const SET_MONTHLY_METRIC_EVENT = "dashboard:set-monthly-metric";
/** Mounts every lazy card up to (and including) the anchor before scrolling to it. */
export const MOUNT_UNTIL_EVENT = "dashboard:mount-until";

/**
 * The monthly-performance card is lazily mounted; if the user clicks a KPI before it mounts, the event is lost.
 * The requested metric is kept here and consumed on mount (or when the event arrives).
 */
let pendingMonthlyMetric: FinancialMetric | null = null;

export function requestMonthlyMetric(metric: FinancialMetric) {
	pendingMonthlyMetric = metric;
	window.dispatchEvent(new CustomEvent(SET_MONTHLY_METRIC_EVENT, { detail: { metric } }));
}

export function consumePendingMonthlyMetric() {
	const metric = pendingMonthlyMetric;
	pendingMonthlyMetric = null;
	return metric;
}

/** Gap kept between the top of the scroll area and a scrolled-to card / a sticky floating panel. */
export const STICKY_GAP = 16;

/** The layout scrolls inside the main content area (SimpleBar), not the window. */
export function getScrollContainer(el: Element | null): HTMLElement | null {
	let node = el?.parentElement ?? null;
	while (node) {
		const { overflowY } = getComputedStyle(node);
		if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight)
			return node;
		node = node.parentElement;
	}
	return null;
}

/**
 * Smoothly scrolls to a card anchor: mounts every lazy card up to the target first (so skeleton → real heights do
 * not move the target mid-scroll), then waits two frames for layout.
 */
export function scrollToAnchor(event: { preventDefault: () => void }, anchor: string) {
	event.preventDefault();
	window.dispatchEvent(new CustomEvent(MOUNT_UNTIL_EVENT, { detail: { anchor } }));
	requestAnimationFrame(() => requestAnimationFrame(() => {
		const el = document.getElementById(anchor);
		if (!el)
			return;
		const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
		const scroller = getScrollContainer(el);
		if (!scroller) {
			window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - STICKY_GAP), behavior });
			return;
		}
		const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - STICKY_GAP;
		scroller.scrollTo({ top: Math.max(0, top), behavior });
	}));
}
