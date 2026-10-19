import { theme } from "antd";
import { useMemo } from "react";

export interface ChartTheme {
	grid: string
	track: string
	border: string
	faint: string
	muted: string
	text: string
	/** Opaque page surface (dot fills, gauge background). */
	surface: string
	/** Tooltip surface. */
	elevated: string
	primary: string
	link: string
	ok: string
	warn: string
	danger: string
	/** Tooltip shadow. */
	shadow: string
	/** Data series palette (cyclic). */
	series: string[]
}

/**
 * SVG cannot read the Tailwind/AntD CSS variables, so charts take real color values from the AntD token,
 * which already follows the light/dark algorithm.
 */
export function useChartTheme(): ChartTheme {
	const { token } = theme.useToken();
	return useMemo(() => ({
		grid: token.colorSplit,
		track: token.colorSplit,
		border: token.colorSplit,
		faint: token.colorTextTertiary,
		muted: token.colorTextSecondary,
		text: token.colorText,
		surface: token.colorBgBase,
		elevated: token.colorBgElevated,
		primary: token.colorPrimary,
		link: token.colorPrimaryText,
		ok: token.colorSuccess,
		warn: token.colorWarning,
		danger: token.colorError,
		shadow: token.boxShadowSecondary,
		series: [token.blue, token.green, token.gold, token.red, token.purple, token.cyan, token.magenta, token.lime],
	}), [token]);
}

export function colorAt(T: ChartTheme, index: number) {
	return T.series[index % T.series.length];
}
