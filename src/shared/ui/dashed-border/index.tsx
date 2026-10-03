import { theme } from "antd";
import "./styles.css";

export interface DashedBorderProps {
	radius?: number
	dashLength?: number
	dashGap?: number
}

/** Decorative dashed outline shared by form cards and report surfaces. */
export function DashedBorder({ radius: radiusOverride, dashLength: dashLengthOverride, dashGap: dashGapOverride }: DashedBorderProps = {}) {
	const { token } = theme.useToken();
	const borderColor = token.colorSplit;
	const borderWidth = token.lineWidth;
	const radius = radiusOverride ?? token.paddingLG + token.borderRadiusSM;
	const dashLength = dashLengthOverride ?? token.sizeXS - token.lineWidthBold;
	const dashGap = dashGapOverride ?? token.paddingXXS;

	return (
		<svg className="dashed-border" aria-hidden="true">
			<rect
				x={borderWidth / 2}
				y={borderWidth / 2}
				width={`calc(100% - ${borderWidth}px)`}
				height={`calc(100% - ${borderWidth}px)`}
				rx={Math.max(0, radius - borderWidth / 2)}
				fill="none"
				stroke={borderColor}
				strokeWidth={borderWidth}
				strokeDasharray={`${dashLength} ${dashGap}`}
			/>
		</svg>
	);
}
