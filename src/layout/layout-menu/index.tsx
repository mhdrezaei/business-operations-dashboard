import type { MenuProps } from "antd";
import type { MenuItemType } from "./types";

import { useDeviceType, usePreferences } from "#src/hooks";
import { removeTrailingSlash } from "#src/router/utils";

import { useAccessStore } from "#src/store";
import { cn } from "#src/utils";

import { ConfigProvider, Menu } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMatches } from "react-router";

import { useStyles } from "./style";
import { getParentKeys } from "./utils";

interface LayoutMenuProps {
	mode?: MenuProps["mode"]
	/**
	 * کنترل مي کند آيا منوي مسير فعلي به صورت خودکار باز شود
	 *
	 * Why?
	 * توجه: وقتي منو در حالت ناوبري بالا و mode افقي است، در ورود اوليه نبايد خودکار باز شود؛
	 * مي توان با autoExpandCurrentMenu = false اين رفتار را خاموش کرد
	 * @see https://github.com/user-attachments/assets/705ae01d-db7f-4f42-b4dd-66adba0dd68f
	 */
	autoExpandCurrentMenu?: boolean
	menus?: MenuItemType[]
	handleMenuSelect?: (key: string, mode: MenuProps["mode"]) => void
	headerBackgroundColor?: string
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

	// Calculate luminance
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	// If luminance is less than 0.5, it's a dark color
	return luminance < 0.5;
}

const emptyArray: MenuItemType[] = [];
export default function LayoutMenu({
	mode = "inline",
	autoExpandCurrentMenu,
	handleMenuSelect,
	menus = emptyArray,
	headerBackgroundColor,
}: LayoutMenuProps) {
	const classes = useStyles();
	const matches = useMatches();
	const wholeMenus = useAccessStore(state => state.wholeMenus);
	const { sidebarCollapsed, sidebarTheme, isDark, accordion } = usePreferences();
	const [openKeys, setOpenKeys] = useState<string[]>([]);
	const { isMobile } = useDeviceType();

	// Check if the header background is dark (for horizontal menu)
	const isHeaderBackgroundDark = mode === "horizontal" && headerBackgroundColor && isColorDark(headerBackgroundColor);

	// Determine menu theme: use dark theme if background is dark or user selected dark theme
	const menuTheme = isHeaderBackgroundDark || isDark ? "dark" : sidebarTheme;

	const menuParentKeys = useMemo(() => {
		return getParentKeys(wholeMenus);
	}, [wholeMenus]);

	const getSelectedKeys = useMemo(
		() => {
			// First, try to find a route that specifies currentActiveMenu (highest priority)
			const currentActiveMatch = matches.findLast(routeItem =>
				routeItem.handle?.currentActiveMenu,
			);

			// If found, return the currentActiveMenu path with its parent keys
			if (currentActiveMatch?.handle?.currentActiveMenu) {
				const activeMenuPath = removeTrailingSlash(currentActiveMatch.handle.currentActiveMenu);
				const parentKeys = menuParentKeys[activeMenuPath] || [];
				return [...parentKeys, activeMenuPath];
			}

			// Fallback: Find the last visible route (not hidden in menu)
			const latestVisibleMatch = matches.findLast(routeItem =>
				routeItem.handle?.hideInMenu !== true,
			);

			// If found, return the route ID path with its parent keys
			if (latestVisibleMatch?.id) {
				const routePath = removeTrailingSlash(latestVisibleMatch.id);
				const parentKeys = menuParentKeys[routePath] || [];
				return [...parentKeys, routePath];
			}

			// Default return empty array if no matches found
			return [];
		},
		[matches, menuParentKeys],
	);

	const menuInlineCollapsedProp = useMemo(() => {
		/* inlineCollapsed فقط در حالت inline قابل استفاده است */
		if (mode === "inline") {
			return { inlineCollapsed: isMobile ? false : sidebarCollapsed };
		}
		return {};
	}, [mode, isMobile, sidebarCollapsed]);

	const handleOpenChange: MenuProps["onOpenChange"] = (keys) => {
		/**
		 * 1. حالت آکاردئون: با کليک، ساير منوها بسته مي شوند
		 * 2. در حالت غيرآکاردئون و جمع شده، با هاور منوهاي ديگر بسته مي شوند
		 *
		 * چرا از نمونه کد antd menu استفاده نشد:
		 * چون در حالت غيرآکاردئون با باز بودن چند منو، پس از سوئيچ به آکاردئون،
		 * کليک روي يک منو بقيه را نمي بندد
		 */
		if (accordion || sidebarCollapsed) {
			// eslint-disable-next-line unicorn/prefer-includes
			const currentOpenKey = keys.find(key => openKeys.indexOf(key) === -1);
			// open
			if (currentOpenKey !== undefined) {
				const parentKeys = menuParentKeys[currentOpenKey] || [];
				setOpenKeys([...parentKeys, currentOpenKey]);
			}
			else {
				// eslint-disable-next-line unicorn/prefer-includes
				const currentCloseKey = openKeys.find(key => keys.indexOf(key) === -1);
				// close
				if (currentCloseKey) {
					setOpenKeys(menuParentKeys[currentCloseKey]);
				}
			}
		}
		else {
			setOpenKeys(keys);
		}
	};

	const menuOpenProps = useMemo(() => {
		// اگر آکاردئون فعال باشد، بايد منو خودکار باز شود
		if (autoExpandCurrentMenu) {
			return {
				openKeys,
				onOpenChange: handleOpenChange,
			};
		}
		return {};
	}, [autoExpandCurrentMenu, openKeys, handleOpenChange]);

	/**
	 * وقتي منوي کناري باز است، منوي فعال را خودکار باز کن
	 * وقتي منوي کناري جمع است، همه منوهاي فعال را ببند
	 * @see https://github.com/user-attachments/assets/df2d7b63-acf4-4faa-bea6-7616b7e69621
	 */
	const updateOpenKeys = useCallback(() => {
		// جمع شدن
		if (sidebarCollapsed) {
			setOpenKeys([]);
		}
		// باز شدن
		else {
			// حالت آکاردئون: فقط منوي فعال را باز کن
			if (accordion) {
				setOpenKeys(getSelectedKeys);
			}
			// حالت غيرآکاردئون: همه منوهاي فعال را باز کن
			else {
				setOpenKeys((prevOpenKeys) => {
					if (prevOpenKeys.length === 0) {
						return getSelectedKeys;
					}
					return prevOpenKeys;
				});
			}
		}
	}, [sidebarCollapsed, accordion, getSelectedKeys]);

	useEffect(() => {
		updateOpenKeys();
	}, [updateOpenKeys]);

	return (
		<ConfigProvider
			theme={{
				components: {
					Menu: mode === "horizontal" && headerBackgroundColor
						? {
							// Submenu popup background
							subMenuItemBg: headerBackgroundColor,
							// Horizontal menu item border radius
							horizontalItemBorderRadius: 8,
							// Horizontal item margin
							itemMarginInline: 4,
							// Item padding
							itemPaddingInline: 12,
						}
						: {},
				},
			}}
		>
			<Menu
				/**
				 * min-w-0 flex-auto مشکل منو در Flex را براي جمع شدن واکنش گرا حل مي کند
				 * @see https://ant-design.antgroup.com/components/menu#why-menu-do-not-responsive-collapse-in-flex-layout
				 */
				className={cn(
					"!border-none min-w-0 flex-auto",
					{
						/**
						 * @fa وقتي منوي کناري جمع است، رنگ پس زمينه اضافه کن
						 * @en When the side menu is collapsed, add background color
						 */
						[classes.menuBackgroundColor]: sidebarCollapsed,
					},
				)}
				inlineIndent={16}
				{...menuInlineCollapsedProp}
				style={{
					height: isMobile ? "100%" : "initial",
					...(mode === "horizontal" && headerBackgroundColor
						? {
							background: headerBackgroundColor,
							// Set CSS variable for submenu background
							["--header-bg-color" as any]: headerBackgroundColor,
						}
						: {}),
				}}
				mode={mode}
				theme={menuTheme}
				items={menus as MenuProps["items"]}
				{...menuOpenProps}
				selectedKeys={getSelectedKeys}
				/**
				 * از onClick به جاي onSelect استفاده مي شود چون وقتي مسير فرزند والد را فعال مي کند،
				 * کليک روي والد بايد همچنان ناوبري کند.
				 * @see https://github.com/user-attachments/assets/cf67a973-f210-45e4-8278-08727ab1b8ce
				 */
				onClick={({ key }) => handleMenuSelect?.(key, mode)}
			/>
		</ConfigProvider>
	);
}
