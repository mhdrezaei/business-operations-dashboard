import type { ReactNode } from "react";

/** Section divider: colored bar + title + rule. */
export function SectionLabel({ children }: { children: ReactNode }) {
	return (
		<div className="flex items-center gap-2.5">
			<span className="w-[3px] h-4 rounded-sm bg-gradient-to-b from-primary to-primaryActive" />
			<span className="text-[12px] font-bold text-colorTextSecondary">{children}</span>
			<span className="flex-1 h-px bg-colorFillSecondary" />
		</div>
	);
}
