import { theme } from "antd";

export function ContractDashedBorder() {
	const { token } = theme.useToken();
	const borderColor = token.colorSplit;
	const borderWidth = token.lineWidth;
	const radius = token.paddingLG + token.borderRadiusSM;
	const dashLength = token.sizeXS - token.lineWidthBold;
	const dashGap = token.paddingXXS;

	return (
		<svg className="contract-dashed-border" aria-hidden="true">
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
