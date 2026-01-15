import type { AppRouteRecordRaw } from "#src/router/types";

import { filterTree } from "#src/utils";

/**
 * توليد پوياي مسيرها - روش فرانت اند
 */
export function generateRoutesByFrontend(
	routes: AppRouteRecordRaw[],
	roles: string[],
) {
	// فيلتر مسيرها بر اساس نقش و بررسي مجوز کاربر
	const finalRoutes = filterTree(routes, (route) => {
		return hasAuthority(route, roles);
	});

	return finalRoutes;
}

/**
 * بررسي دسترسي براي مسير
 * @param route
 * @param accesses
 */
function hasAuthority(route: AppRouteRecordRaw, accesses: string[]) {
	const authority = route.handle?.roles;
	if (!authority) {
		return true;
	}
	return accesses.some(value => authority.includes(value));
}
