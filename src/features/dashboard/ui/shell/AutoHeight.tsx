import type { CSSProperties, ReactNode } from "react";
import { prefersReducedMotion } from "#src/features/dashboard/model/navigation";
import { useEffect, useRef, useState } from "react";

interface AutoHeightProps {
	children: ReactNode
	/**
	 * card: animates only while the height changes (the card and its row neighbours do not jump).
	 * modal: always clips and transitions; measured with `offsetHeight + 2` — the opening modal is scaled, so
	 * getBoundingClientRect would be ~5% short and the last rows stayed cut (2px = table border).
	 */
	variant?: "card" | "modal"
}

const ANIM_MS = 360;

export function AutoHeight({ children, variant = "card" }: AutoHeightProps) {
	const innerRef = useRef<HTMLDivElement>(null);
	const lastRef = useRef<number | null>(null);
	const [height, setHeight] = useState<number | null>(null);
	const [animating, setAnimating] = useState(false);
	const isModal = variant === "modal";

	useEffect(() => {
		const el = innerRef.current;
		if (!el || typeof ResizeObserver === "undefined")
			return undefined;
		const reduce = prefersReducedMotion();
		let timer: ReturnType<typeof setTimeout> | undefined;
		const ro = new ResizeObserver(() => {
			const h = isModal ? el.offsetHeight + 2 : el.offsetHeight;
			if (!isModal && lastRef.current !== null && lastRef.current !== h && !reduce) {
				setAnimating(true);
				clearTimeout(timer);
				timer = setTimeout(() => setAnimating(false), ANIM_MS);
			}
			lastRef.current = h;
			setHeight(h);
		});
		ro.observe(el);
		return () => {
			ro.disconnect();
			clearTimeout(timer);
		};
	}, [isModal]);

	const style: CSSProperties | undefined = isModal
		? (height === null ? undefined : { height })
		: {
			height: height ?? undefined,
			transition: animating ? "height .32s cubic-bezier(.4,0,.2,1)" : undefined,
			overflow: animating ? "hidden" : undefined,
		};

	return (
		<div
			style={style}
			className={isModal ? "overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none" : undefined}
		>
			<div ref={innerRef} className={isModal ? undefined : "relative"}>
				{children}
			</div>
		</div>
	);
}
