import type { ThemeConfig } from "antd";

/**
 * Get font family based on language/RTL direction
 */
function getFontFamily(isRTL?: boolean) {
	return isRTL
		? "'IranYekan', 'Tahoma', 'Arial', sans-serif"
		: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif";
}

/**
 * پیکربندي تم روشن سفارشي Ant Design
 *
 * English: Custom Ant Design light theme configuration
 *
 * @see https://ant.design/theme-editor-cn (نسخه چيني)
 * @see https://ant.design/docs/react/customize-theme-cn (راهنماي پیکربندي چيني)
 * @see https://ant.design/theme-editor (English version)
 * @see https://ant.design/docs/react/customize-theme (English version configuration guide)
 */
export const customAntdLightTheme: ThemeConfig = {
	token: {
		fontFamily: getFontFamily(false),
	},
};

/**
 * پیکربندي تم تيره سفارشي Ant Design
 *
 * English: Custom Ant Design dark theme configuration
 *
 * @see https://ant.design/theme-editor-cn (نسخه چيني)
 * @see https://ant.design/docs/react/customize-theme-cn (راهنماي پیکربندي چيني)
 * @see https://ant.design/theme-editor (English version)
 * @see https://ant.design/docs/react/customize-theme (English version configuration guide)
 */
export const customAntdDarkTheme: ThemeConfig = {
	token: {
		fontFamily: getFontFamily(false),
	},
};

/**
 * Get theme configuration with dynamic font family based on RTL
 */
export function getCustomAntdTheme(isDark: boolean, isRTL: boolean): ThemeConfig {
	const baseTheme = isDark ? customAntdDarkTheme : customAntdLightTheme;

	return {
		...baseTheme,
		token: {
			...baseTheme.token,
			fontFamily: getFontFamily(isRTL),
		},
	};
}
