import type { AppRouteRecordRaw } from "#src/router/types";
import { Iframe } from "#src/components/iframe";
import { ContainerLayout } from "#src/layout";
import { lazy } from "react";
import { Outlet } from "react-router";
import { addRouteIdByPath } from "./add-route-id-by-path";

const ExceptionUnknownComponent = lazy(() => import("#src/pages/exception/unknown-component"));

/**
 * @fa دريافت غيرهمزمان کامپوننت هاي صفحه
 * @en Async load page components
 */
const pageModules = import.meta.glob([
	"/src/pages/**/*.tsx",
	// Exclude exception pages from lazy loading
	"!/src/pages/exception/**/*.tsx",
]);

/**
 * @fa دريافت مسير کامپوننت بر اساس مسير
 * @en Get component path based on route
 */
export function getComponentPathByRoute(route: AppRouteRecordRaw & { component?: string }) {
	if (route.component) {
		return `/src/pages${route.component}`;
	}
	else {
		return `/src/pages${route.path}/index.tsx`;
	}
}

/**
 * @fa توليد مسيرهاي فرانت اند بر اساس تنظيمات مسير بک اند
 * @en Generate frontend routes based on backend route configurations
 */
export async function generateRoutesFromBackend(backendRoutes: Array<AppRouteRecordRaw>) {
	const pageModulePaths = Object.keys(pageModules);
	if (!backendRoutes?.length)
		return [];

	/**
	 * @fa بارگذاري پويا و تنظيم کامپوننت مسير
	 * @en Dynamically load and set route components
	 * @param route شيء پیکربندي مسير
	 * @param componentPath مسير فايل کامپوننت
	 */
	const loadRouteComponent = async (route: AppRouteRecordRaw, componentPath: string) => {
		const modulePath = componentPath;
		const moduleIndex = pageModulePaths.findIndex(path => path === modulePath);

		if (moduleIndex !== -1) {
			const lazyComponent = pageModules[pageModulePaths[moduleIndex]];
			route.Component = lazy(lazyComponent as any);
		}
		else {
			console.warn(`[Frontend component not found]: ${componentPath}`);
			route.Component = ExceptionUnknownComponent;
		}
	};

	/**
	 * تبديل پیکربندي مسير
	 * @param route پیکربندي اصلي مسير
	 * @param parentPath مسير والد (براي مسيرهاي تودرتو)
	 * @returns پیکربندي تبديل شده مسير
	 */
	const transformRoute = async (route: AppRouteRecordRaw, parentComponentPath?: string): Promise<AppRouteRecordRaw> => {
		const transformedRoute: AppRouteRecordRaw = {
			...route,
			handle: {
				...route.handle,
				backstage: true,
			},
		};

		// رسيدگي به مسير index (ارث از والد)
		if (transformedRoute.index === true && parentComponentPath) {
			await loadRouteComponent(transformedRoute, parentComponentPath);
		}
		// رسيدگي به مسير iframe
		else if (transformedRoute.handle?.iframeLink) {
			transformedRoute.Component = Iframe;
		}
		// رسيدگي به مسير لينک خارجي
		else if (transformedRoute.handle?.externalLink) {
			// لينک خارجي نيازي به کامپوننت ندارد
		}
		// رسيدگي به مسيرهاي داراي فرزند
		else if (transformedRoute.children?.length) {
			transformedRoute.Component = parentComponentPath ? Outlet : ContainerLayout;
		}
		// رسيدگي به مسير معمولي
		else {
			await loadRouteComponent(transformedRoute, getComponentPathByRoute(transformedRoute));
		}

		// رسيدگي بازگشتي به زيرمسيرها
		if (transformedRoute.children?.length) {
			transformedRoute.children = await Promise.all(
				transformedRoute.children.map(child =>
					transformRoute(child, getComponentPathByRoute(transformedRoute)),
				),
			);
		}

		return transformedRoute;
	};

	/**
	 * استانداردسازي پیکربندي مسير براي اطمينان از داشتن فرزند
	 */
	const normalizeRouteStructure = (route: AppRouteRecordRaw): AppRouteRecordRaw => {
		if (!route.children?.length) {
			return {
				...route,
				children: [{
					index: true,
					handle: { ...route.handle },
				}],
			} as AppRouteRecordRaw;
		}
		return route;
	};

	// پردازش پیکربندي مسير
	const normalizedRoutes = backendRoutes.map(normalizeRouteStructure);
	const transformedRoutes = await Promise.all(
		normalizedRoutes.map(route => transformRoute(route)),
	);

	return addRouteIdByPath(transformedRoutes);
}
