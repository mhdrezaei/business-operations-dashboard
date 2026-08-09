import { createUseStyles } from "react-jss";

export const useContractApprovalHistoryStyles = createUseStyles(({ prefixCls, token }) => ({
	historyCard: {
		width: "100%",
		[`& > .${prefixCls}-card-body`]: {
			padding: token.padding,
		},
	},
	historyContent: {
		display: "flex",
		flexDirection: "column",
		gap: token.margin,
	},
	historyTitle: {
		color: token.colorText,
		fontWeight: token.fontWeightStrong,
		paddingInline: token.paddingXXS,
	},
	historyList: {
		display: "flex",
		flexDirection: "column",
		gap: token.marginSM,
	},
	historyCollapse: {
		background: token.colorBgLayout,
		border: `1px solid ${token.colorFillSecondary}`,
		borderRadius: `calc(${token.borderRadiusLG}px + ${token.borderRadius}px) !important`,
		overflow: "hidden",
		[`& > .${prefixCls}-collapse-item`]: {
			borderBottom: 0,
		},
		[`& > .${prefixCls}-collapse-item > .${prefixCls}-collapse-header`]: {
			alignItems: "center",
			background: "transparent",
			minHeight: token.controlHeightLG,
			padding: token.padding,
		},
		[`& .${prefixCls}-collapse-expand-icon`]: {
			color: token.colorPrimary,
		},
		[`& .${prefixCls}-collapse-content`]: {
			background: token.colorBgLayout,
			borderTop: 0,
		},
		[`& .${prefixCls}-collapse-content-box`]: {
			paddingBlock: 0,
			paddingBottom: token.paddingXS,
			paddingInline: token.paddingLG,
		},
	},
	collapseLabel: {
		alignItems: "center",
		display: "flex",
		gap: token.marginSM,
		justifyContent: "space-between",
		paddingInlineEnd: token.paddingXS,
		width: "100%",
	},
	subjectLabel: {
		background: token.colorPrimary,
		borderRadius: token.borderRadiusSM,
		color: token.colorTextLightSolid,
		fontWeight: token.fontWeightStrong,
		paddingBlock: token.paddingXXS,
		paddingInline: token.paddingXS,
	},
	timeline: {
		marginTop: token.marginXS,
		[`& .${prefixCls}-timeline-item-head-custom`]: {
			background: "transparent",
			border: 0,
			height: "auto",
			lineHeight: 0,
			padding: 0,
			width: "auto",
		},
		[`& .${prefixCls}-timeline-item-head-custom svg`]: {
			display: "block",
		},
		[`& .${prefixCls}-timeline-item-last`]: {
			paddingBottom: 0,
		},
		[`& .${prefixCls}-timeline-item-content`]: {
			minHeight: token.controlHeightLG,
		},
	},
}));
