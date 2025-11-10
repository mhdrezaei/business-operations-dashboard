import type { ButtonProps } from "antd";
import { useDeviceType, usePreferences } from "#src/hooks";
import { useLayout } from "#src/layout/hooks/use-layout";
import { GlobalSearch, Preferences } from "#src/layout/widgets";
import { NotificationContainer } from "#src/layout/widgets/notification/notification-container";
import { usePreferencesStore, useTabsStore } from "#src/store";
import { cn } from "#src/utils";

import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { theme as antdTheme, Button, ConfigProvider, theme } from "antd";

import { FullscreenButton } from "./components/fullscreen-button";
import { LanguageButton } from "./components/language-button";
import { ThemeButton } from "./components/theme-button";
import { UserMenu } from "./components/user-menu";

export interface LayoutHeaderProps {
	className?: string
	children?: React.ReactNode
}

const buttonProps: ButtonProps = {
	size: "large",
	className: "px-[11px]",
};

/**
 * Check if a color is dark by calculating its luminance
 * @param color - Hex color string (e.g., "#1677ff")
 * @returns true if the color is dark, false if light
 */
function isColorDark(color: string): boolean {
	if (!color || color === "transparent")
		return false;

	// Remove # if present
	const hex = color.replace("#", "");

	// Convert to RGB
	const r = Number.parseInt(hex.substring(0, 2), 16);
	const g = Number.parseInt(hex.substring(2, 4), 16);
	const b = Number.parseInt(hex.substring(4, 6), 16);

	// Calculate luminance using the formula
	// https://www.w3.org/TR/WCAG20/#relativeluminancedef
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	// If luminance is less than 0.5, it's a dark color
	return luminance < 0.5;
}

export default function LayoutHeader({ className, children }: LayoutHeaderProps) {
	const {
		token: { Menu },
	} = theme.useToken();
	const {
		sidebarCollapsed,
		setPreferences,
		isDark,
		sidebarTheme,
	} = usePreferences();
	const headerBackgroundType = usePreferencesStore(state => state.headerBackgroundType);
	const headerBackgroundColor = usePreferencesStore(state => state.headerBackgroundColor);
	const headerHeight = usePreferencesStore(state => state.headerHeight);
	const { isMobile } = useDeviceType();
	const isMaximize = useTabsStore(state => state.isMaximize);
	const { isTopNav, isMixedNav } = useLayout();

	// Check if custom header background is dark
	const isCustomHeaderDark = (isTopNav || isMixedNav) && headerBackgroundType !== "default" && isColorDark(headerBackgroundColor);

	const isFixedDarkTheme = isDark || (sidebarTheme === "dark" && (isMixedNav || isTopNav)) || isCustomHeaderDark;

	// Calculate header background color
	const getHeaderBackground = () => {
		if (isTopNav || isMixedNav) {
			if (headerBackgroundType === "default") {
				return (isDark || (sidebarTheme === "dark" && (isMixedNav || isTopNav))) ? Menu?.darkItemBg : Menu?.itemBg;
			}
			return headerBackgroundColor;
		}
		return (isDark || (sidebarTheme === "dark" && (isMixedNav || isTopNav))) ? Menu?.darkItemBg : Menu?.itemBg;
	};

	return (
		<ConfigProvider
			theme={{
				algorithm: isFixedDarkTheme
					? antdTheme.darkAlgorithm
					: antdTheme.defaultAlgorithm,
			}}
		>
			<header
				className={cn(
					"flex-shrink-0 flex gap-5 justify-between items-center transition-all md:px-4",
					{ "overflow-hidden": isMaximize },
					className,
				)}
				style={{
					background: getHeaderBackground(),
					height: isMaximize ? 0 : headerHeight,
					minHeight: isMaximize ? 0 : headerHeight,
				}}
			>

				{
					isMobile
						? (
							<Button
								type="text"
								icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
								onClick={() => setPreferences("sidebarCollapsed", !sidebarCollapsed)}
								className="h-full"
							/>
						)
						: null
				}

				<div className="flex items-center flex-grow h-full overflow-hidden">
					{children}
				</div>

				<div className="flex items-center">
					<GlobalSearch />
					<Preferences {...buttonProps} />
					<ThemeButton {...buttonProps} />
					<LanguageButton {...buttonProps} />
					<FullscreenButton {...buttonProps} target={document.documentElement} />
					<NotificationContainer {...buttonProps} />
					<UserMenu {...buttonProps} />
				</div>
			</header>
		</ConfigProvider>
	);
}
