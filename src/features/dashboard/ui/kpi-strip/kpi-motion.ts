import type { CSSProperties } from "react";
import { formatNumber, numberLocale } from "#src/features/dashboard/model/format";
import { prefersReducedMotion } from "#src/features/dashboard/model/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Digits step every ROLL_MS — both while waiting for data (random roll) and while counting — so the change speed is
 * the same before and after the data arrives.
 */
const ROLL_MS = 50;

/** "Loading": instead of zero, the digits keep changing (like a spinning counter) until the data arrives. */
export function roll(digits: number) {
	return formatNumber(Math.floor(Math.random() * 10 ** digits));
}

/**
 * p stays continuous but is sampled only once per ROLL_MS; fixed steps (like 1/24) produced repeated digits
 * (344,444…).
 */
export function useSampled(p: number) {
	const ref = useRef({ v: p, t: 0 });
	const now = performance.now();
	if (p >= 1 || p <= 0)
		ref.current = { v: p, t: now };
	else if (now - ref.current.t >= ROLL_MS)
		ref.current = { v: p, t: now };
	return ref.current.v;
}

/** Re-renders every `ms` while active (rolling digits); never under reduced motion. */
export function useRollTick(active: boolean, ms = ROLL_MS) {
	const [, setTick] = useState(0);
	useEffect(() => {
		if (!active || prefersReducedMotion())
			return undefined;
		const id = setInterval(() => setTick(t => t + 1), ms);
		return () => clearInterval(id);
	}, [active, ms]);
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const LATIN_DIGITS = "0123456789";
const DIGIT = /[0-9\u06F0-\u06F9]/g;

/**
 * Digits lock one by one from left to right like a mechanical counter while the rest keep spinning; since p slows
 * down, the spinning settles gradually too (instead of the right digits changing fast until the last moment and
 * stopping at once). The spinning number depends only on p, so it is stable between renders.
 */
export function settle(value: number, p: number) {
	const s = formatNumber(Math.round(value));
	if (p >= 1)
		return s;
	const digits = numberLocale() === "fa-IR" ? FA_DIGITS : LATIN_DIGITS;
	const total = (s.match(DIGIT) || []).length;
	const key = Math.floor(p * 40);
	let i = 0;
	return s.replace(DIGIT, (ch) => {
		const idx = i++;
		if (p >= 0.995 - (0.7 * (total - 1 - idx)) / total)
			return ch;
		const h = Math.abs(Math.sin((key + 1) * 12.9898 + idx * 78.233) * 43758.5453) % 1;
		return digits[Math.floor(h * 10)];
	});
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const SPRING = "cubic-bezier(.2,.8,.2,1)";

/**
 * Staggered entry (fade + rise) and counting from zero; replays with new data.
 * hold: data has not arrived yet — numbers and lines stay at zero; the animation plays from the start when it arrives.
 */
export function useReveal(depA: unknown, depB: unknown, duration = 1200, delay = 150, linear = false, hold = false) {
	const [reduce] = useState(prefersReducedMotion);
	const [shown, setShown] = useState(reduce);
	const [p, setP] = useState(reduce ? 1 : 0);

	useEffect(() => {
		if (reduce)
			return undefined;
		const id = requestAnimationFrame(() => setShown(true));
		const settleTimer = setTimeout(() => setShown(true), 120);
		return () => {
			cancelAnimationFrame(id);
			clearTimeout(settleTimer);
		};
	}, [reduce]);

	useEffect(() => {
		if (hold) {
			setP(0);
			return undefined;
		}
		if (reduce) {
			setP(1);
			return undefined;
		}
		let raf = 0;
		const t0 = performance.now() + delay;
		setP(0);
		const tick = (now: number) => {
			const t = Math.min(1, Math.max(0, (now - t0) / duration));
			setP(linear ? t : easeOut(t));
			if (t < 1)
				raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		// rAF may not run (background tab / headless): land on the final value anyway.
		const settleTimer = setTimeout(() => setP(1), duration + delay + 200);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(settleTimer);
		};
	}, [depA, depB, duration, delay, linear, reduce, hold]);

	return { p, shown };
}

/** Shared reveal state of the strip panels. */
export interface KpiMotion {
	/** Eased progress 0..1 (bars). */
	p: number
	/** p sampled every ROLL_MS (counting digits). */
	pn: number
	shown: boolean
	/** Digits roll (waiting for data and the first moment of counting); numbers are not clickable meanwhile. */
	rolling: boolean
}

/** Circumference of the stage rings (r = 18, the middle of the 2px circle border). */
export const RING_LEN = 2 * Math.PI * 18;
const RING_W = 1;
const SEG_W = 1.3;
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Contract-cycle animation chain: the first circle's perimeter fills → the line to the next circle → that circle's
 * perimeter → … ; q is linear time 0..1, the result is the progress of every ring and every segment between rings.
 */
export function chainProgress(q: number, n: number) {
	const total = n * RING_W + Math.max(0, n - 1) * SEG_W;
	let at = q * total;
	const ring: number[] = [];
	const seg: number[] = [];
	for (let i = 0; i < n; i += 1) {
		ring.push(smooth(Math.min(1, Math.max(0, at / RING_W))));
		at -= RING_W;
		if (i < n - 1) {
			seg.push(smooth(Math.min(1, Math.max(0, at / SEG_W))));
			at -= SEG_W;
		}
	}
	return { ring, seg };
}

export function enterStyle(shown: boolean, delayMs: number, offset = 10): CSSProperties {
	return {
		opacity: shown ? 1 : 0,
		transform: shown ? "none" : `translateY(${offset}px)`,
		transition: `opacity .5s ease ${delayMs}ms, transform .6s ${SPRING} ${delayMs}ms`,
	};
}

export const HOVER_LIFT
	= "transition-[transform,border-color,box-shadow,background-color] duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none";
