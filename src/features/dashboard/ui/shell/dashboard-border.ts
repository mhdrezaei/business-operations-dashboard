import type { CSSProperties } from "react";
import { useCardBorderColor } from "#src/shared/lib/use-card-border-color";

/** Style that defines `--dash-border` (the Card outline color) for a subtree; portals need their own. */
export function useDashboardBorderStyle() {
	const borderColor = useCardBorderColor();
	return { "--dash-border": borderColor } as CSSProperties;
}
