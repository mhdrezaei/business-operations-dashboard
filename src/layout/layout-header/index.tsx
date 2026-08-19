import type { ButtonProps } from "antd";
import { useDeviceType, usePreferences } from "#src/hooks";
import { useLayout } from "#src/layout/hooks/use-layout";
import { GlobalSearch } from "#src/layout/widgets";
import { NotificationContainer } from "#src/layout/widgets/notification/notification-container";
import { usePreferencesStore, useTabsStore } from "#src/store";
import { cn } from "#src/utils";

import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { theme as antdTheme, Button, ConfigProvider, theme } from "antd";

import { LanguageButton } from "./components/language-button";
import { ThemeButton } from "./components/theme-button";
import { UserMenu } from "./components/user-menu";

export interface LayoutHeaderProps {
	className?: string
	children?: React.ReactNode
}

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
	const { token } = theme.useToken();
	const { Menu } = token;
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
	const effectiveHeaderHeight = Math.max(
		headerHeight,
		token.controlHeightLG + token.padding * 2,
	);
	const buttonProps: ButtonProps = {
		size: "large",
		className: "!inline-flex !items-center !justify-center !rounded-[var(--header-action-radius)] !border-0 !bg-[var(--header-action-bg)] !p-0 !leading-none !text-[var(--header-action-color)] hover:!bg-[var(--header-action-hover-bg)] hover:!text-[var(--header-action-hover-color)] focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-2 focus-visible:!outline-colorPrimary [&_.ant-badge]:!inline-flex [&_.ant-badge]:items-center [&_.ant-badge]:justify-center [&_.ant-btn-icon]:!m-0 [&_.ant-btn-icon]:flex [&_.ant-btn-icon]:items-center [&_.ant-btn-icon]:justify-center [&_svg]:block [&_svg]:shrink-0",
		style: {
			"--header-action-bg": token.colorPrimaryBgHover,
			"--header-action-hover-bg": token.colorPrimaryActive,
			"--header-action-color": token.colorText,
			"--header-action-hover-color": token.colorPrimaryTextHover,
			"--header-action-radius": `${token.borderRadius}px`,
			"width": token.controlHeightLG,
			"height": token.controlHeightLG,
			"minWidth": token.controlHeightLG,
		} as React.CSSProperties,
	};

	const getHeaderBackground = () => {
		if ((isTopNav || isMixedNav) && headerBackgroundType !== "default") {
			return headerBackgroundColor;
		}

		return isFixedDarkTheme ? Menu?.darkItemBg : Menu?.itemBg;
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
					"mx-3 my-3 flex flex-shrink-0 items-center justify-between border border-solid transition-all sm:mx-4 lg:mx-6",
					{ "overflow-hidden": isMaximize },
					className,
				)}
				style={{
					background: getHeaderBackground(),
					borderColor: token.colorPrimaryBorder,
					borderRadius: token.borderRadius * 2,
					columnGap: token.margin,
					paddingInline: token.padding,
					height: isMaximize ? 0 : effectiveHeaderHeight,
					minHeight: isMaximize ? 0 : effectiveHeaderHeight,
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

				<div className="flex items-center" style={{ gap: token.margin }} dir="ltr">
					<UserMenu {...buttonProps} />
					<NotificationContainer {...buttonProps} />
					<LanguageButton {...buttonProps} />
					<ThemeButton {...buttonProps} />
					<GlobalSearch
						buttonClassName={buttonProps.className}
						buttonStyle={buttonProps.style}
					/>
				</div>
			</header>
		</ConfigProvider>
	);
}
