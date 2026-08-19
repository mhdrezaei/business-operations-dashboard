import { createUseStyles } from "react-jss";

import { tabbarHeight } from "../constants";

export const useStyles = createUseStyles(({ token }) => {
	return {
		tabsContainer: {
			"backgroundColor": token.colorBgContainer,
			"border": `1px solid ${token.colorBorder}`,
			"boxSizing": "border-box",
			"height": tabbarHeight,
			"marginInline": "12px",
			"paddingBlock": token.paddingXS - 1,
			"paddingInline": token.paddingSM,
			"borderRadius": token.borderRadius * 2,
			"& .ant-tabs": {
				height: "100%",
			},
			"@media (min-width: 640px)": {
				marginInline: "16px",
			},
			"@media (min-width: 1024px)": {
				marginInline: "24px",
			},
			"@media (max-width: 639px)": {
				paddingInline: token.paddingXS,
			},
		},
		controls: {
			display: "flex",
			alignItems: "center",
			gap: token.marginXXS,
			height: "100%",
			paddingInline: token.paddingXXS,
		},
		controlButton: {
			"width": `${token.controlHeightLG}px !important`,
			"height": `${token.controlHeightLG}px !important`,
			"minWidth": `${token.controlHeightLG}px !important`,
			"padding": "0 !important",
			"borderRadius": `${token.borderRadius}px !important`,
			"color": `${token.colorPrimary} !important`,
			"fontSize": `${token.fontSizeXL}px !important`,
			"lineHeight": 1,
			"& .ant-btn-icon": {
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
			},
			"& svg": {
				width: "1em",
				height: "1em",
			},
			"&:hover": {
				backgroundColor: `${token.colorPrimaryBg} !important`,
				color: `${token.colorPrimaryHover} !important`,
			},
			"&:focus-visible": {
				outline: `2px solid ${token.colorPrimary}`,
				outlineOffset: "1px",
			},
		},
		resetTabs: {
			"& .ant-tabs-nav::before": {
				display: "none",
			},
			"& .ant-tabs-nav": {
				"margin": 0,
				"height": "100%",
				"& .ant-tabs-tab": {
					// انيميشن داخلي antd با انيميشن DND تداخل دارد
					transition: "background-color 160ms ease, color 160ms ease",
					marginLeft: "0px !important",
					border: "none !important",
					borderRadius: "9px !important",
					paddingTop: "0 !important",
					paddingBottom: "0 !important",
					height: "32px",
					alignSelf: "center",
				},
				"& .ant-tabs-tab-btn:focus-visible": {
					outline: `2px solid ${token.colorPrimary}`,
					outlineOffset: "2px",
					borderRadius: "6px",
				},
			},
		},
		brisk: {
			"& .ant-tabs-nav": {
				"& .ant-tabs-tab": {
					borderRight: `1px solid ${token.colorBorder} !important`,
				},
			},
			"& .ant-tabs-ink-bar": {
				backgroundColor: token.colorPrimary,
				visibility: "visible !important",
			},
		},
		plain: {
			"& .ant-tabs-nav": {
				"& .ant-tabs-tab": {
					borderRight: `1px solid ${token.colorBorder} !important`,
				},
			},
		},
		chrome: {
			"& .ant-tabs-nav": {
				"& .ant-tabs-nav-list": {
					gap: "8px",
				},
				"& .ant-tabs-tab:not(.ant-tabs-tab-active)": {
					"backgroundColor": token.colorFillTertiary,
					"borderRadius": "9px !important",
					"padding": "0 12px !important",
					"color": token.colorTextSecondary,
					"&:hover": {
						backgroundColor: token.colorFillSecondary,
						color: token.colorText,
					},
				},
				"& .ant-tabs-tab-active": {
					"padding": "0 12px !important",
					"backgroundColor": token.colorPrimaryBg,
					"borderRadius": "9px !important",
					"& .ant-tabs-tab-btn": {
						color: `${token.colorPrimary} !important`,
					},
				},
			},
		},
		card: {
			"& .ant-tabs-nav-list": {
				gap: "5px",
			},
			"& .ant-tabs-nav": {
				"& .ant-tabs-tab": {
					"backgroundColor": token.colorBgContainer,
					"border": `1px solid ${token.colorBorder} !important`,
					"position": "relative",
					"borderRadius": "7px !important",
					"padding": "0px 12px !important",
					"marginTop": "3px",
					"marginBottom": "3px",
					"&:hover": {
						backgroundColor: token.colorBorder,
						color: "inherit",
					},
				},
				"& .ant-tabs-tab-active": {
					backgroundColor: token.colorBgTextActive,
				},
			},
		},
	};
});
