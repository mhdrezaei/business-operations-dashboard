import { theme } from "antd";
import { useMemo } from "react";

export type KpiTone = "ok" | "warn" | "danger" | "link";

/** Solid and soft (tint) colors of the KPI tones, for inline SVG/gradient styles. */
export function useKpiTones() {
	const { token } = theme.useToken();
	return useMemo(() => ({
		ok: { color: token.colorSuccess, soft: token.colorSuccessBg },
		warn: { color: token.colorWarning, soft: token.colorWarningBg },
		danger: { color: token.colorError, soft: token.colorErrorBg },
		link: { color: token.colorPrimaryText, soft: token.colorPrimaryBg },
		faint: token.colorTextTertiary,
		muted: token.colorTextSecondary,
		text: token.colorText,
		/** Neutral finished ring / chain segment (border tokens are transparent in the light theme). */
		neutral: token.colorTextQuaternary,
	}), [token]);
}
