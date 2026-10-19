import type { HomeTone } from "#src/features/home/model/home-cards";
import { theme } from "antd";
import { useMemo } from "react";

/** Solid and soft (tint) color of each card tone, from the active Ant Design theme. */
export function useHomeTones(): Record<HomeTone, { color: string, soft: string }> {
	const { token } = theme.useToken();
	return useMemo(() => ({
		primary: { color: token.colorPrimary, soft: token.colorPrimaryBg },
		cyan: { color: token.cyan, soft: token.cyan1 },
		purple: { color: token.purple, soft: token.purple1 },
		green: { color: token.colorSuccess, soft: token.colorSuccessBg },
	}), [token]);
}
