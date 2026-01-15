import type { MenuProps } from "antd";

import { useCurrentRoute } from "#src/hooks";
import { removeTrailingSlash } from "#src/router/utils";
import { useAccessStore } from "#src/store";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMatches, useNavigate } from "react-router";

import { useLayout } from "../hooks";
import { findDeepestFirstItem, findRootMenuByPath, translateMenus } from "./utils";

export function useMenu() {
	const wholeMenus = useAccessStore(state => state.wholeMenus);
	const { isMixedNav, isTwoColumnNav } = useLayout();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const translatedMenus = translateMenus(wholeMenus, t);

	const { pathname } = useCurrentRoute();
	const matches = useMatches();
	/**
	 * در حالت منوي ترکيبي بايد menu items جدا شوند
	 */
	const shouldSplitMenuItems = useMemo(
		() => isMixedNav || isTwoColumnNav,
		[isMixedNav, isTwoColumnNav],
	);

	/**
	 * کليد منوي سطح اول ناوبري کناري در حالت ترکيبي
	 */
	const sideNavMenuKeyInSplitMode = useMemo(() => {
		if (!shouldSplitMenuItems)
			return "";

		// Try to find active menu from currentActiveMenu first
		const activeMenuPath = matches.findLast(routeItem =>
			routeItem.handle?.currentActiveMenu,
		)?.handle?.currentActiveMenu;

		// Fallback to current pathname if no currentActiveMenu found
		const targetPath = activeMenuPath ? removeTrailingSlash(activeMenuPath) : removeTrailingSlash(pathname);

		const { rootMenuPath } = findRootMenuByPath(translatedMenus, targetPath);
		return rootMenuPath ?? "";
	}, [shouldSplitMenuItems, pathname, matches]);

	/* در حالت منوي ترکيبي بايد menu items جدا شوند */
	const splitSideNavItems = useMemo(
		() => {
			const foundMenu = translatedMenus.find(item => item?.key === sideNavMenuKeyInSplitMode);
			if (!foundMenu) {
				return [];
			}
			return foundMenu?.children ?? [foundMenu];
		},
		[sideNavMenuKeyInSplitMode, translatedMenus],
	);

	/**
	 * منوي بالايي
	 */
	const topNavItems = useMemo(() => {
		if (!shouldSplitMenuItems) {
			return translatedMenus;
		}
		return translatedMenus.map((item) => {
			return {
				...item,
				/* اگر children خالي باشد، onSelect اجرا نمي شود */
				children: undefined,
			};
		});
	}, [shouldSplitMenuItems, translatedMenus]);

	/**
	 * منوي کناري
	 */
	const sideNavItems = useMemo(() => {
		return shouldSplitMenuItems ? splitSideNavItems : translatedMenus;
	}, [shouldSplitMenuItems, splitSideNavItems, translatedMenus]);

	/**
	 * پردازش رويداد کليک منو
	 */
	const handleMenuSelect = (key: string, mode: MenuProps["mode"]) => {
		if (key === removeTrailingSlash(pathname)) {
			return;
		}
		/* 1. حالت غيرترکيبي 2. منوي کناري در حالت ترکيبي */
		if (!shouldSplitMenuItems || mode !== "horizontal") {
			// eslint-disable-next-line regexp/no-unused-capturing-group
			if (/http(s)?:/.test(key)) {
				window.open(key);
			}
			else {
				navigate(key);
			}
		}
		else {
			/* ناوبري بالايي در حالت ترکيبي */
			const rootMenu = translatedMenus.find(item => item?.key === key);
			const targetMenu = findDeepestFirstItem(rootMenu?.children ?? []);
			/* کليک روي ناوبري بالا به اولين آيتم فرزند مي رود */
			if (!targetMenu) {
				navigate(key);
			}
			else {
				navigate(targetMenu.key);
			}
		}
	};

	return {
		handleMenuSelect,
		sideNavMenuKeyInSplitMode,
		topNavItems,
		sideNavItems,
	};
}
