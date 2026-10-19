import { ConfigProvider, theme } from "antd";
import { useContext } from "react";

/**
 * Outline color of an AntD Card in the active theme. The global border tokens are transparent in the light theme
 * (Tailwind turns them into black), so custom card-like surfaces take the Card component token instead.
 */
export function useCardBorderColor() {
	const antdContext = useContext(ConfigProvider.ConfigContext);
	const { token } = theme.useToken();
	const configuredCardBorder = antdContext.theme?.components?.Card?.colorBorderSecondary;
	return typeof configuredCardBorder === "string" ? configuredCardBorder : token.colorBorderSecondary;
}
