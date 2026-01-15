import type { ReactNode } from "react";

import { usePreferences } from "#src/hooks";

import { ConfigProvider, theme } from "antd";
import { useContext } from "react";
import { ThemeProvider } from "react-jss";

/**
 * کامپوننت ارائه دهنده تم JSS سفارشي
 *
 * @fa کامپوننت ارائه دهنده تم JSS سفارشي براي فراهم کردن تم در برنامه React
 * @en Custom JSS theme provider component, used to provide JSS themes in React applications
 */
export interface JSSThemeProviderProps {
	/**
	 * زيرکامپوننت ها
	 *
	 * @fa زيرکامپوننت هايي که تم JSS را دريافت مي کنند
	 * @en Children components, which will receive the JSS theme
	 */
	children: ReactNode
}

const { useToken } = theme;

/**
 * کامپوننت JSSThemeProvider
 *
 * @fa کامپوننت JSSThemeProvider براي ارسال token هاي Ant Design و وضعيت تم سراسري به زيرکامپوننت ها
 * @en JSSThemeProvider component, used to pass Ant Design tokens and global theme state to child components
 *
 * @param {JSSThemeProviderProps} props ويژگي هاي کامپوننت
 * @returns {JSX.Element} عنصر JSX بازگشتي
 */
export function JSSThemeProvider({ children }: JSSThemeProviderProps) {
	const antdContext = useContext(ConfigProvider.ConfigContext);
	const prefixCls = antdContext.getPrefixCls();
	const { token } = useToken();
	const { theme, isDark, isLight } = usePreferences();

	return (
		<ThemeProvider theme={{ token, theme, isDark, isLight, prefixCls }}>
			{children}
		</ThemeProvider>
	);
}
