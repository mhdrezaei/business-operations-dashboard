import type { ReactNode } from "react";
import { MOUNT_UNTIL_EVENT } from "#src/features/dashboard/model/navigation";
import { useEffect, useRef, useState } from "react";

/** Cards mount a few hundred px before reaching the viewport, so the user rarely sees the skeleton. */
const ROOT_MARGIN = "400px 0px";

/**
 * A card (and its API requests) mounts only when it gets near the viewport — not all cards at page entry.
 * After the first appearance it stays mounted forever so its state and inner filters are never reset.
 */
export function LazyMount({ children, minHeight = 320 }: { children: ReactNode, minHeight?: number }) {
	const ref = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");

	useEffect(() => {
		const el = ref.current;
		if (visible || !el)
			return undefined;
		const io = new IntersectionObserver((entries) => {
			if (entries.some(e => e.isIntersecting)) {
				setVisible(true);
				io.disconnect();
			}
		}, { rootMargin: ROOT_MARGIN });
		io.observe(el);
		return () => io.disconnect();
	}, [visible]);

	useEffect(() => {
		if (visible)
			return undefined;
		const onMountUntil = (e: Event) => {
			const target = document.getElementById((e as CustomEvent<{ anchor?: string }>).detail?.anchor ?? "");
			const el = ref.current;
			if (!target || !el)
				return;
			// The target itself (el inside target) or a card placed before the target in the document.
			if (target.contains(el) || target.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)
				setVisible(true);
		};
		window.addEventListener(MOUNT_UNTIL_EVENT, onMountUntil);
		return () => window.removeEventListener(MOUNT_UNTIL_EVENT, onMountUntil);
	}, [visible]);

	if (visible)
		return children;
	// flex-1: inside the row's flex column the skeleton takes the space the card would (row cards share a height).
	return <div ref={ref} aria-hidden className="flex-1 rounded-[14px] bg-colorFillQuaternary animate-pulse" style={{ minHeight }} />;
}
