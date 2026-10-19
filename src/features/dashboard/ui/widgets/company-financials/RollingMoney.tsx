import { formatNumber, toNum } from "#src/features/dashboard/model/format";
import { prefersReducedMotion } from "#src/features/dashboard/model/navigation";
import { useEffect, useRef, useState } from "react";

const DIGIT_ROLL_MS = 700;

/** While the response is pending (spinning) random digits of the previous length roll; on arrival the shown number settles smoothly on the final value. */
function useRollingNumber(target: number, spinning: boolean) {
	const end = Number.isFinite(target) ? target : 0;
	const [shown, setShown] = useState(end);
	const shownRef = useRef(end);
	shownRef.current = shown;
	useEffect(() => {
		if (prefersReducedMotion()) {
			setShown(end);
			return undefined;
		}
		if (spinning) {
			const digits = Math.min(15, Math.max(1, String(Math.abs(Math.round(end))).length));
			const id = setInterval(() => {
				const r = Math.floor(Math.random() * 10 ** digits);
				setShown(end < 0 ? -r : r);
			}, 70);
			return () => clearInterval(id);
		}
		const from = shownRef.current;
		const start = performance.now();
		let raf = 0;
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / DIGIT_ROLL_MS);
			setShown(from + (end - from) * (1 - (1 - t) ** 3));
			if (t < 1)
				raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		// rAF may not run (background tab); land on the final value anyway.
		const settle = setTimeout(() => setShown(end), DIGIT_ROLL_MS + 50);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(settle);
		};
	}, [end, spinning]);
	return shown;
}

interface RollingMoneyProps {
	value: unknown
	spinning: boolean
	className?: string
}

export function RollingMoney({ value, spinning, className }: RollingMoneyProps) {
	const shown = useRollingNumber(toNum(value) ?? 0, spinning);
	return (
		<strong className={className} dir="ltr">
			{toNum(value) === null && !spinning ? "—" : formatNumber(Math.round(shown))}
		</strong>
	);
}
