import { DateTimeDisplay, Scrollbar } from "#src/components";
import { useLanguage, usePreferences } from "#src/hooks";

import { theme as antdTheme, ConfigProvider } from "antd";

import { useEffect, useState } from "react";
import { headerHeight } from "../constants";

export interface LayoutSidebarProps {
	children?: React.ReactNode
	computedSidebarWidth: number
}

export default function LayoutSidebar({ children, computedSidebarWidth }: LayoutSidebarProps) {
	const { sidebarCollapsed, sidebarTheme, isDark, setPreferences } = usePreferences();
	const { isRTL } = useLanguage();

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
						width: computedSidebarWidth,
						backgroundColor: "transparent",
					}
				}
				className={`fixed ${isStickTop ? "top-0" : "top-20"} bottom-0 flex flex-col ${isRTL ? "right-3" : "left-3"} overflow-x-hidden overflow-y-auto transition-all`}
			>
				{/* <Logo sidebarCollapsed={sidebarCollapsed} /> */}
				<div className="h-full overflow-hidden">
					<Scrollbar>
						<DateTimeDisplay
							sidebarCollapsed={sidebarCollapsed}
							onToggleCollapse={handleToggleCollapse}
						/>

						{children}
					</Scrollbar>
				</div>
			</aside>
		</ConfigProvider>
	);
}
