import type { AppRouteRecordRaw, RouteFileModule } from "#src/router/types";

import { loginPath } from "#src/router/extra-info";
import { ascending, mergeRouteModules } from "#src/router/utils";
import { traverseTreeValues } from "#src/utils";
import { coreRoutes } from "./core";

// فايل هاي مسير خارجي
export const externalRouteFiles: RouteFileModule = import.meta.glob("./external/**/*.ts", { eager: true });
// فايل هاي مسير ثابت فرانت اند
export const staticRouteFiles: RouteFileModule = import.meta.glob("./static/**/*.ts", { eager: true });

/**
 * فايل هاي مسير پويا از بک اند
 */
export const dynamicRouteFiles: RouteFileModule = import.meta.glob("./modules/**/*.ts", { eager: true });

/**
 * مسيرهاي خارجي: 1. بدون بررسي مجوز 2. بدون درخواست، مثل API اطلاعات کاربر
 * @example "privacy-policy", "terms-of-service" و غيره
 */
export const externalRoutes: AppRouteRecordRaw[] = mergeRouteModules(externalRouteFiles);

/** مسيرهاي پويا */
export const dynamicRoutes: AppRouteRecordRaw[] = mergeRouteModules(dynamicRouteFiles);

/** مسيرهاي ثابت */
export const staticRoutes: AppRouteRecordRaw[] = mergeRouteModules(staticRouteFiles);

/**
 * فهرست مسيرهاي پايه شامل مسيرهاي هسته و خارجي است و هميشه در سيستم وجود دارد
 */
const baseRoutes = ascending([
	...coreRoutes,
	...externalRoutes,
	...dynamicRoutes,
]);

/** فهرست مسيرهاي مجوزدار شامل مسيرهاي پويا و ثابت */
const accessRoutes = [
	...staticRoutes,
];

/**
 * فهرست سفيد مسيرها: 1. بدون بررسي مجوز 2. بدون درخواست، مثل API اطلاعات کاربر
 * @example "privacy-policy", "terms-of-service" و غيره
 */
const whiteRouteNames = [
	loginPath,
	...traverseTreeValues(externalRoutes, route => route.path),
];

export {
	accessRoutes,
	baseRoutes,
	whiteRouteNames,
};
