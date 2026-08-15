import { createUseStyles } from "react-jss";

const sidebarActiveColor = "#175CFE";

export const useStyles = createUseStyles(({ token }) => ({
	menuBackgroundColor: {
		"& .ant-menu-submenu-selected .ant-menu-submenu-title": {
			backgroundColor: token.Menu?.itemSelectedBg ?? token.colorPrimaryBg,
		},
	},
	sidebarMenu: {
		"paddingBlock": 8,
		"background": "transparent !important",
		"&.ant-menu-inline": {
			borderInlineEnd: "0 !important",
		},
		"& .ant-menu-sub.ant-menu-inline": {
			background: "transparent !important",
		},
		"& .ant-menu-item, & .ant-menu-submenu-title": {
			color: token.colorTextSecondary,
			transition: "color 0.2s ease, background-color 0.2s ease",
		},
		"& .ant-menu-item:hover, & .ant-menu-submenu-title:hover": {
			color: token.colorPrimary,
		},
		"& .ant-menu-item-icon, & .ant-menu-submenu-title .ant-menu-item-icon": {
			fontSize: 24,
		},
		"&.ant-menu-inline-collapsed .ant-menu-item-icon, &.ant-menu-inline-collapsed .ant-menu-submenu-title .ant-menu-item-icon": {
			display: "flex !important",
			alignItems: "center",
			justifyContent: "center",
			flex: "0 0 24px",
			minWidth: 24,
			width: 24,
			height: 24,
			marginInline: "0 !important",
			fontSize: "24px !important",
			lineHeight: "24px",
		},
		"&.ant-menu-inline-collapsed .ant-menu-item-icon > svg, &.ant-menu-inline-collapsed .ant-menu-submenu-title .ant-menu-item-icon > svg": {
			display: "block",
			width: 24,
			height: 24,
		},
		"&.ant-menu-inline-collapsed > .ant-menu-submenu": {
			width: 48,
			marginBlock: 5,
			marginInline: "auto !important",
		},
		"&.ant-menu-inline-collapsed > .ant-menu-item, &.ant-menu-inline-collapsed > .ant-menu-submenu > .ant-menu-submenu-title": {
			display: "flex !important",
			alignItems: "center",
			justifyContent: "center",
			width: 48,
			height: 48,
			marginInline: "auto !important",
			paddingInline: "0 !important",
			lineHeight: "48px",
		},
		"&.ant-menu-inline-collapsed > .ant-menu-submenu > .ant-menu-submenu-title": {
			margin: "0 !important",
		},
		"&.ant-menu-inline-collapsed > .ant-menu-item .ant-menu-title-content, &.ant-menu-inline-collapsed > .ant-menu-submenu > .ant-menu-submenu-title .ant-menu-title-content, &.ant-menu-inline-collapsed > .ant-menu-submenu > .ant-menu-submenu-title .ant-menu-submenu-arrow": {
			display: "none !important",
		},
		"& .ant-menu-submenu-arrow": {
			color: "inherit",
		},
		"& .ant-menu-item-selected, & .ant-menu-submenu-selected > .ant-menu-submenu-title": {
			backgroundColor: `${token.Menu?.itemSelectedBg ?? token.colorPrimaryBg} !important`,
			color: `${sidebarActiveColor} !important`,
		},
		"& .ant-menu-item-selected .ant-menu-title-content, & .ant-menu-item-selected .ant-menu-item-icon, & .ant-menu-item-selected .ant-menu-submenu-arrow, & .ant-menu-submenu-selected > .ant-menu-submenu-title .ant-menu-title-content, & .ant-menu-submenu-selected > .ant-menu-submenu-title .ant-menu-item-icon, & .ant-menu-submenu-selected > .ant-menu-submenu-title .ant-menu-submenu-arrow": {
			color: `${sidebarActiveColor} !important`,
		},
	},
}));
