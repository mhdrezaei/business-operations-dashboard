import { DateTimeDisplay, Scrollbar } from "#src/components";
import { useLanguage, usePreferences } from "#src/hooks";

import { theme as antdTheme, ConfigProvider } from "antd";

import { useEffect, useState } from "react";
import { headerHeight, siderTriggerHeight } from "../constants";
import { SiderTrigger } from "../widgets";

export interface LayoutSidebarProps {
	children?: React.ReactNode
	computedSidebarWidth: number
}

export default function LayoutSidebar({ children, computedSidebarWidth }: LayoutSidebarProps) {
	const { sidebarCollapsed, sidebarTheme, isDark, setPreferences } = usePreferences();
	const { isRTL } = useLanguage();
	const {
		token: { Menu },
	} = antdTheme.useToken();

	const isFixedDarkTheme = isDark || sidebarTheme === "dark";
	const [isStickTop, setIsStickTop] = useState(false);

	useEffect(() => {
		const onScroll = () => {
			// وقتی اسکرول از ارتفاع هدر رد شد
			setIsStickTop(window.scrollY >= headerHeight);
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		onScroll();

		return () => window.removeEventListener("scroll", onScroll);
	}, []);
	const handleToggleCollapse = () => {
		setPreferences("sidebarCollapsed", !sidebarCollapsed);
	};

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
				className={`fixed  ${isStickTop ? "top-0" : "top-20"} flex flex-col justify-between bottom-0  rounded-md ${isRTL ? "right-3 border-l border-l-colorBorderSecondary" : "left-3 border-r border-r-colorBorderSecondary"} overflow-x-hidden overflow-y-auto transition-all`}
			>
				{/* <Logo sidebarCollapsed={sidebarCollapsed} /> */}
				<div className="overflow-hidden" style={{ height: `calc(100% - ${headerHeight}px - ${siderTriggerHeight}px)` }}>
					<Scrollbar>
						<DateTimeDisplay
							sidebarCollapsed={sidebarCollapsed}
							onToggleCollapse={handleToggleCollapse}
						/>

						{children}
					</Scrollbar>
				</div>
				<SiderTrigger />
			</aside>
		</ConfigProvider>
	);
}
