import { createUseStyles } from "react-jss";

export const useContractAddendaTableStyles = createUseStyles(({ prefixCls, token }) => ({
	contractTable: {
		[`& .${prefixCls}-table-expanded-row > .${prefixCls}-table-cell`]: {
			background: `${token.colorBgContainer} !important`,
			borderBottom: "0 !important",
			padding: "0 !important",
		},
		[`& .${prefixCls}-table-tbody .${prefixCls}-table-wrapper:only-child .${prefixCls}-table`]: {
			marginBlock: "0 !important",
			marginInline: "0 !important",
		},
		[`& .${prefixCls}-table-expanded-row-fixed`]: {
			margin: "0 !important",
			padding: "0 !important",
		},
	},
	expandedContent: {
		background: token.colorBgLayout,
		overflow: "hidden",
	},
	addendaTable: {
		[`& .${prefixCls}-table`]: {
			background: token.colorBgLayout,
			borderRadius: 0,
		},
		[`& .${prefixCls}-table-container`]: {
			borderRadius: "0 !important",
		},
		[`& .${prefixCls}-table-thead > tr > th`]: {
			background: `${token.colorBgLayout} !important`,
			borderRadius: "0 !important",
		},
		[`& .${prefixCls}-table-tbody > tr > td`]: {
			background: `${token.colorBgLayout} !important`,
		},
		[`& .${prefixCls}-table-tbody > tr:hover > td`]: {
			background: `${token.colorFillTertiary} !important`,
		},
		[`& .${prefixCls}-table-row-indent + .${prefixCls}-table-row-expand-icon`]: {
			marginInlineEnd: token.marginXS,
		},
	},
}));
