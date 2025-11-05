import { Scrollbar } from "#src/components";
import { useLanguage, usePreferences } from "#src/hooks";

import { theme as antdTheme, ConfigProvider } from "antd";

import { headerHeight, siderTriggerHeight } from "../constants";
import { Logo, SiderTrigger } from "../widgets";

export interface LayoutSidebarProps {
	children?: React.ReactNode
	computedSidebarWidth: number
}

export default function LayoutSidebar({ children, computedSidebarWidth }: LayoutSidebarProps) {
	const { sidebarCollapsed, sidebarTheme, isDark } = usePreferences();
	const { isRTL } = useLanguage();
	const {
		token: { Menu },
	} = antdTheme.useToken();

	const isFixedDarkTheme = isDark || sidebarTheme === "dark";

	return (
		<ConfigProvider
			theme={{
				algorithm: isFixedDarkTheme
					? antdTheme.darkAlgorithm
					: antdTheme.defaultAlgorithm,
			}}
		>
			<aside
				style={
					{
						// One pixel border
						width: computedSidebarWidth + 1,
						backgroundColor: isFixedDarkTheme ? Menu?.darkItemBg : Menu?.itemBg,
						boxShadow: isRTL ? "-3px 0 5px 0 rgb(29, 35, 41, 0.05)" : "3px 0 5px 0 rgb(29, 35, 41, 0.05)",
					}
				}
				className={`fixed top-0 bottom-0 ${isRTL ? "right-0 border-l border-l-colorBorderSecondary" : "left-0 border-r border-r-colorBorderSecondary"} overflow-x-hidden overflow-y-auto transition-all`}
			>
				<Logo sidebarCollapsed={sidebarCollapsed} />
				<div className="overflow-hidden" style={{ height: `calc(100% - ${headerHeight}px - ${siderTriggerHeight}px)` }}>
					<Scrollbar>
						{children}
					</Scrollbar>
				</div>
				<SiderTrigger />
			</aside>
		</ConfigProvider>
	);
}
