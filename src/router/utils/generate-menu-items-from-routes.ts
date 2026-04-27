import type { UserInfoType } from "#src/api/user/types";
import type { MenuItemType } from "#src/layout/layout-menu/types";
import type { AppRouteRecordRaw } from "#src/router/types";

import { menuIcons } from "#src/icons/menu-icons";
import { isString } from "#src/utils";
import { hasRouteAccess } from "#src/utils/access-policy";

import { createElement } from "react";
import { Link } from "react-router";

export function generateMenuItemsFromRoutes(routeList: AppRouteRecordRaw[], user?: UserInfoType) {
	return routeList.reduce<MenuItemType[]>((acc, item) => {
		const noIndexRoute = Array.isArray(item.children)
			? item.children.filter(route => !route.index && !route?.handle?.hideInMenu)
			: [];
		const childMenuItems = noIndexRoute.length > 0
			? generateMenuItemsFromRoutes(noIndexRoute, user)
			: [];
		const canShowCurrentRoute = !user || hasRouteAccess(item, user);

		if (item?.handle?.hideInMenu || (!canShowCurrentRoute && childMenuItems.length === 0)) {
			return acc;
		}

		const label = item.handle?.title;
		const externalLink = item?.handle?.externalLink;
		const iconName = item?.handle?.icon;

		const menuItem: MenuItemType = {
			key: item.path!,
			label: externalLink
				? createElement(
					Link,
					{
						onClick: (event) => {
							event.stopPropagation();
						},
						to: externalLink,
						target: "_blank",
						rel: "noopener noreferrer",
					},
					label,
				)
				: label,
		};

		if (iconName) {
			menuItem.icon = iconName;
			if (isString(iconName)) {
				if (menuIcons[iconName]) {
					menuItem.icon = createElement(menuIcons[iconName]);
				}
				else {
					console.warn(`menu-icon: icon "${iconName}" not found in src/icons/menu-icons.ts file`);
				}
			}
		}

		if (childMenuItems.length > 0) {
			menuItem.children = childMenuItems;
		}

		return [...acc, menuItem];
	}, []);
}
