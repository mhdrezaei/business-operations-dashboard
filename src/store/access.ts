import type { MenuItemType } from "#src/layout/layout-menu/types";
import type { AppRouteRecordRaw } from "#src/router/types";

import { rootRoute, router } from "#src/router";
import { ROOT_ROUTE_ID } from "#src/router/constants";
import { baseRoutes } from "#src/router/routes";
import { ascending, flattenRoutes, generateMenuItemsFromRoutes } from "#src/router/utils";

import { create } from "zustand";

interface AccessState {
	// منوي مسيرها
	wholeMenus: MenuItemType[]
	// مسيرهاي مجاز React Router
	routeList: AppRouteRecordRaw[]
	// مسيرهاي تخت شده با id به عنوان کليد
	flatRouteList: Record<string, AppRouteRecordRaw>
	// آيا مجوزها دريافت شده اند
	isAccessChecked: boolean
}

const initialState: AccessState = {
	wholeMenus: generateMenuItemsFromRoutes(baseRoutes),
	routeList: baseRoutes,
	flatRouteList: flattenRoutes(baseRoutes),
	isAccessChecked: false,
};

interface AccessAction {
	setAccessStore: (routes: AppRouteRecordRaw[]) => AccessState
	reset: () => void
};

export const useAccessStore = create<AccessState & AccessAction>(set => ({
	...initialState,

	setAccessStore: (routes) => {
		const newRoutes = ascending([...baseRoutes, ...routes]);
		/* افزودن مسيرهاي جديد به ريشه */
		router.patchRoutes(ROOT_ROUTE_ID, routes);
		const flatRouteList = flattenRoutes(newRoutes);
		const wholeMenus = generateMenuItemsFromRoutes(newRoutes);
		const newState = {
			wholeMenus,
			routeList: newRoutes,
			flatRouteList,
			isAccessChecked: true,
		};
		set(() => newState);
		return newState;
	},

	reset: () => {
		/* حذف مسيرهاي پويا */
		router._internalSetRoutes(rootRoute);
		set(initialState);
	},
}));
