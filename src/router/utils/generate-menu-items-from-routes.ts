import type { MenuItemType } from "#src/layout/layout-menu/types";
import type { AppRouteRecordRaw } from "#src/router/types";

import { menuIcons } from "#src/icons/menu-icons";
import { isString } from "#src/utils";

import { createElement } from "react";
import { Link } from "react-router";

/**
 * توليد آرايه آيتم هاي منو بر اساس فهرست مسيرها
 *
 * @param routeList فهرست مسيرها از نوع AppRouteRecordRaw
 * @returns آرايه آيتم هاي منو از نوع MenuItemType
 */
export function generateMenuItemsFromRoutes(routeList: AppRouteRecordRaw[]) {
	return routeList.reduce<MenuItemType[]>((acc, item) => {
		const label = item.handle?.title;
		const externalLink = item?.handle?.externalLink;
		const iconName = item?.handle?.icon;

		const menuItem: MenuItemType = {
			key: item.path!,
			label: externalLink
				? createElement(
					Link,
					{
						// جلوگيري از انتشار رويداد براي پرهيز از کليک منو
						onClick: (e) => {
							e.stopPropagation();
						},
						to: externalLink,
						target: "_blank",
						rel: "noopener noreferrer",
					},
					label,
				)
				: (
					label
				),
		};
		if (iconName) {
			menuItem.icon = iconName;
			if (isString(iconName)) {
				if (menuIcons[iconName]) {
					menuItem.icon = createElement(menuIcons[iconName]);
				}
				else {
					console.warn(
						`menu-icon: icon "${iconName}" not found in src/icons/menu-icons.ts file`,
					);
				}
			}
		}
		if (Array.isArray(item.children) && item.children.length > 0) {
			// فيلتر مسيرهاي غير از صفحه اصلي و مخفي در منو
			const noIndexRoute = item.children.filter(route => !route.index && !route?.handle?.hideInMenu);
			if (noIndexRoute.length > 0) {
				menuItem.children = generateMenuItemsFromRoutes(noIndexRoute);
			}
		}
		if (item?.handle?.hideInMenu) {
			return acc;
		}
		return [...acc, menuItem];
	}, []);
}
