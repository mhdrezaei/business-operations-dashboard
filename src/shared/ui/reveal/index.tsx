import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface RevealProps {
	show: boolean
	/** true: children stay mounted (hidden) while `show` is false; false: they are unmounted after the exit animation. */
	keepMounted?: boolean
	/** Classes for the animated wrapper (e.g. when it is a flex/grid child). */
	className?: string
	/** true: only fade + slide (compositor-only, no layout per frame, content swaps instantly). Use for heavy subtrees where animating height lags. */
	fade?: boolean
	children: ReactNode
}

const HIDDEN = { opacity: 0, y: 10, height: 0, overflow: "hidden" };
// overflow is released once shown so shadows/focus rings of the content are not clipped
const VISIBLE = { opacity: 1, y: 0, height: "auto", transitionEnd: { overflow: "visible" } };
const TRANSITION = { duration: 0.22, ease: "easeOut" } as const;

/** نمایش/پنهان‌سازی انیمیشنی فیلدها و بخش‌های شرطی فرم (fade + slide + height). */
const FADE_HIDDEN = { opacity: 0, y: 10 };
const FADE_VISIBLE = { opacity: 1, y: 0 };

export function Reveal({ show, keepMounted = false, fade = false, className = "min-w-0", children }: RevealProps) {
	if (fade && !keepMounted) {
		return show
			? (
				<motion.div initial={FADE_HIDDEN} animate={FADE_VISIBLE} transition={TRANSITION} className={className}>
					{children}
				</motion.div>
			)
			: null;
	}

	if (keepMounted) {
		return (
			<motion.div
				initial={false}
				animate={show ? { ...VISIBLE, visibility: "visible" } : { ...HIDDEN, transitionEnd: { visibility: "hidden" } }}
				transition={TRANSITION}
				className={className}
				style={{ pointerEvents: show ? "auto" : "none" }}
				aria-hidden={!show}
			>
				{children}
			</motion.div>
		);
	}

	return (
		<AnimatePresence initial={false}>
			{show
				? (
					<motion.div
						key="reveal"
						initial={HIDDEN}
						animate={VISIBLE}
						exit={HIDDEN}
						transition={TRANSITION}
						className={className}
					>
						{children}
					</motion.div>
				)
				: null}
		</AnimatePresence>
	);
}
