import { useLayoutEffect, useRef } from "react";

export function useCompanyTabsScroll(enabled: boolean) {
	const containerRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLElement | null>(null);

	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!enabled || !container)
			return;

		let parent = container.parentElement;
		while (parent && !/auto|scroll/.test(getComputedStyle(parent).overflowY))
			parent = parent.parentElement;

		if (!parent)
			return;

		scrollRef.current = parent;
		// Short and loading panels must still leave room for the sticky tab bar.
		const updateHeight = () => {
			container.style.minHeight = `${parent.clientHeight}px`;
		};
		updateHeight();
		const observer = new ResizeObserver(updateHeight);
		observer.observe(parent);
		return () => {
			observer.disconnect();
			scrollRef.current = null;
		};
	}, [enabled]);

	const resetTabScroll = () => {
		const container = containerRef.current;
		const scroller = scrollRef.current;
		if (!container || !scroller)
			return;

		const containerTop = container.getBoundingClientRect().top;
		const scrollTop = scroller.getBoundingClientRect().top + scroller.clientTop;
		const offset = containerTop - scrollTop;
		// Reset before Ant Design swaps panels, without moving a visible header.
		if (offset < 0) {
			scroller.scrollTo({
				top: Math.max(0, scroller.scrollTop + offset),
				behavior: "instant",
			});
		}
	};

	return { containerRef, resetTabScroll };
}
