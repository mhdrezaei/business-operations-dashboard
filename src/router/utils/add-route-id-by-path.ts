import type { AppRouteRecordRaw } from "#src/router/types";

/**
 * افزودن يک ID يکتا به شيء مسير، جايگزين id توليد شده، اين ID به طور پيش فرض همان path است
 * {
 *   path: '/dashboard',
 * }
 *
 * پس از تبديل
 *
 * {
 *   path: '/dashboard',
 *   id: '/dashboard',
 * }
 */
export function addRouteIdByPath(routes: AppRouteRecordRaw[], parentId = "") {
	return routes.map((route) => {
		// اگر مسير index باشد، id برابر با مسير والد + "/" است
		const newRoute = { ...route, id: route.index ? `${parentId}/` : route.path };

		if (newRoute.children && newRoute.children.length > 0) {
			newRoute.children = addRouteIdByPath(newRoute.children, route.path);
		}

		return newRoute;
	});
}
