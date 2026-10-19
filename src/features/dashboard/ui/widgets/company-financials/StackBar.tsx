import type { StackSegment } from "./company-financials.model";
import { formatPercent, toNum } from "#src/features/dashboard/model/format";
import { theme } from "antd";
import { useEffect, useRef, useState } from "react";
import { OTHER_KEY } from "./company-financials.model";

interface StackSegProps {
	g: StackSegment
	exiting: boolean
	dimmed: boolean
	setHover: (key: string | null) => void
}

/** One bar segment: grows from zero on mount and resizes smoothly when its weight changes (or drops to zero when leaving). */
function StackSeg({ g, exiting, dimmed, setHover }: StackSegProps) {
	const { token } = theme.useToken();
	const [grown, setGrown] = useState(false);
	useEffect(() => {
		const id = requestAnimationFrame(() => setGrown(true));
		return () => cancelAnimationFrame(id);
	}, []);
	const isOther = g.key === OTHER_KEY;
	return (
		<span
			onMouseEnter={() => !exiting && setHover(g.key)}
			title={`${g.name} · ${formatPercent(g.share)}`}
			className="min-w-0 flex items-center justify-center overflow-hidden whitespace-nowrap text-[11px] font-semibold rounded-[6px] cursor-default"
			style={{
				flex: `${grown && !exiting ? g.weight : 0} 1 0%`,
				background: isOther ? g.color : `linear-gradient(180deg, color-mix(in srgb, ${token.colorWhite} 22%, transparent), transparent 60%), ${g.color}`,
				boxShadow: isOther ? "none" : `inset 0 -1px 0 color-mix(in srgb, ${token.colorTextBase} 12%, transparent)`,
				color: isOther ? token.colorText : token.colorWhite,
				opacity: dimmed ? 0.25 : 1,
				pointerEvents: exiting ? "none" : undefined,
				transition: "flex-grow .6s cubic-bezier(.2,.8,.2,1), opacity .2s",
			}}
		>
			{!exiting && (toNum(g.share) ?? 0) >= 7 ? formatPercent(g.share) : ""}
		</span>
	);
}

interface SegItem {
	g: StackSegment
	exiting: boolean
}

interface StackBarProps {
	segs: StackSegment[]
	hover: string | null
	setHover: (key: string | null) => void
}

/** Segments missing from the new response stay a moment (until the transition ends) with zero weight, so they collapse instead of jumping. */
export function StackBar({ segs, hover, setHover }: StackBarProps) {
	const [items, setItems] = useState<SegItem[]>(() => segs.map(g => ({ g, exiting: false })));
	// `segs` is a fresh array every render; re-sync only when the content (key/weight/share) changes.
	const sig = segs.map(g => `${g.key}:${g.weight}:${g.share}`).join("|");
	const segsRef = useRef(segs);
	segsRef.current = segs;
	useEffect(() => {
		const current = segsRef.current;
		setItems((prev) => {
			const keys = new Set(current.map(g => g.key));
			const next: SegItem[] = current.map(g => ({ g, exiting: false }));
			prev.forEach((it, idx) => {
				if (!keys.has(it.g.key))
					next.splice(Math.min(idx, next.length), 0, { g: it.g, exiting: true });
			});
			return next;
		});
		const id = setTimeout(() => setItems(prev => prev.filter(it => !it.exiting)), 700);
		return () => clearTimeout(id);
	}, [sig]);
	return (
		<div className="flex gap-[3px] h-[26px]" dir="rtl">
			{items.map(({ g, exiting }) => (
				<StackSeg key={g.key} g={g} exiting={exiting} dimmed={hover != null && hover !== g.key} setHover={setHover} />
			))}
		</div>
	);
}
