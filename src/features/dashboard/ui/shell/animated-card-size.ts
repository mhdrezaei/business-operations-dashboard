import type { RefObject } from "react";
import { prefersReducedMotion } from "#src/features/dashboard/model/navigation";
import { useEffect } from "react";

/**
 * Smoothly animates height changes of `fill` cards (cards in the same row are stretched to the same height).
 *
 * All animated cards form one group. When a card height suddenly jumps (a one-frame jump, not the content's own
 * continuous transition) every card is pinned to its previous height and eases frame by frame towards the *live*
 * natural height of its row:
 * - the target is re-measured every frame, so content still transitioning (an opening panel, …) is followed with no
 *   final jump/overshoot;
 * - cards of the same row (same top) share a target = the tallest natural height, so they always move together;
 * - the observer is ignored while animating so cards do not re-trigger each other.
 */
export const CARD_TRANSITION = "border-color .2s ease, box-shadow .25s ease, transform .25s ease";
const JUMP_PX = 16;
/** Exponential smoothing time constant; small so the card follows transitioning content without lag. */
const TWEEN_TAU_MS = 50;
const TWEEN_MAX_MS = 1500;
/** el → last stable height */
const sizeGroup = new Map<HTMLElement, number>();
let sizeBusy = false;
let sizeRaf = 0;

function settleCards(allEls: HTMLElement[], from: Map<HTMLElement, number>) {
	const els = allEls.filter(el => el.isConnected && el.parentElement);
	if (els.length === 0)
		return;
	sizeBusy = true;
	const cur = new Map(els.map(el => [el, from.get(el) ?? el.offsetHeight]));
	els.forEach((el) => {
		el.style.transition = CARD_TRANSITION;
		el.style.flex = "none";
		el.style.overflow = "hidden";
		el.style.height = `${cur.get(el)}px`;
	});
	const t0 = performance.now();
	let prevT = t0;
	let calm = 0;
	const finish = () => {
		els.forEach((el) => {
			el.style.height = "";
			el.style.flex = "";
			el.style.overflow = "";
		});
		sizeGroup.forEach((_, el) => sizeGroup.set(el, el.offsetHeight));
		sizeBusy = false;
		sizeRaf = 0;
	};
	const step = (now: number) => {
		if (!els.every(el => el.isConnected)) {
			sizeBusy = false;
			sizeRaf = 0;
			return;
		}
		// 1) live natural height of every card (flex off + auto height)
		els.forEach((el) => {
			el.style.height = "auto";
		});
		const nat = new Map(els.map(el => [el, el.offsetHeight]));
		// 2) shared target of each row = tallest natural height of same-top cards.
		// The row key is taken once here: in step 3 the heights of upper cards move lower cards, and recomputing the
		// key made the target undefined (→ NaN → invalid height → jump without animation).
		const rowKey = new Map(els.map(el => [el, Math.round(el.parentElement!.getBoundingClientRect().top)]));
		const rowMax = new Map<number, number>();
		els.forEach((el) => {
			const k = rowKey.get(el)!;
			rowMax.set(k, Math.max(rowMax.get(k) ?? 0, nat.get(el)!));
		});
		// 3) exponential smoothing towards the target
		const dt = Math.min(64, now - prevT);
		prevT = now;
		const k = 1 - Math.exp(-dt / TWEEN_TAU_MS);
		let settled = true;
		els.forEach((el) => {
			const target = rowMax.get(rowKey.get(el)!)!;
			let v = cur.get(el)!;
			v += (target - v) * k;
			if (Math.abs(target - v) < 0.5)
				v = target;
			else
				settled = false;
			cur.set(el, v);
			el.style.height = `${v}px`;
		});
		calm = settled ? calm + 1 : 0;
		if (calm >= 2 || now - t0 > TWEEN_MAX_MS)
			finish();
		else
			sizeRaf = requestAnimationFrame(step);
	};
	sizeRaf = requestAnimationFrame(step);
}

const sizeObserver = typeof ResizeObserver === "undefined"
	? null
	: new ResizeObserver(() => {
		if (sizeBusy)
			return;
		const from = new Map<HTMLElement, number>();
		let jumped = false;
		sizeGroup.forEach((last, el) => {
			const next = el.offsetHeight;
			// A continuous change (the content's own transition) is a few px per frame and is followed as is;
			// only a sudden jump is animated.
			if (Math.abs(next - last) >= JUMP_PX)
				jumped = true;
			from.set(el, last);
			sizeGroup.set(el, next);
		});
		if (jumped)
			settleCards([...from.keys()], from);
	});

export function useAnimatedCardSize(ref: RefObject<HTMLElement | null>, enabled: boolean) {
	useEffect(() => {
		const el = ref.current;
		if (!enabled || !el || !sizeObserver || prefersReducedMotion())
			return undefined;
		sizeGroup.set(el, el.offsetHeight);
		sizeObserver.observe(el);
		return () => {
			sizeObserver.unobserve(el);
			sizeGroup.delete(el);
			if (sizeGroup.size === 0) {
				cancelAnimationFrame(sizeRaf);
				sizeBusy = false;
			}
		};
	}, [ref, enabled]);
}
