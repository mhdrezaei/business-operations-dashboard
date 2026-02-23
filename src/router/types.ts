import type { DomainPermissionAction } from "#src/api/user/types";
import type { ReactNode } from "react";
import type { IndexRouteObject, NonIndexRouteObject, createBrowserRouter as RemixRouter } from "react-router";

export interface IndexRouteMeta extends Omit<IndexRouteObject, "id"> {
	redirect?: string
	handle: RouteMeta
}
export interface NonIndexRouteMeta extends Omit<NonIndexRouteObject, "id"> {
	redirect?: string
	handle: RouteMeta
	children?: AppRouteRecordRaw[]
}

export type AppRouteRecordRaw = IndexRouteMeta | NonIndexRouteMeta;

export interface RouteMeta {
	/**
	 * عنوان مسیر، معمولاً برای عنوان صفحه یا نمایش در منوی کناری
	 */
	title: ReactNode

	/**
	 * آیکن منو برای نمایش در منوی کناری
	 */
	icon?: ReactNode

	/**
	 * ترتیب منو برای کنترل ترتیب نمایش در منوی کناری
	 */
	order?: number

	/**
	 * پیکربندی مجوز صفحه؛ فقط کاربران دارای مجوز می توانند دسترسی داشته باشند
	 */
	roles?: string[]

	/**
	 * Domain permission scope from /audit/access snapshot.
	 */
	accessDomain?: string

	/**
	 * Required CRUD action in the selected accessDomain.
	 */
	accessAction?: DomainPermissionAction

	/**
	 * مجوز سطح دکمه در صفحه برای نمایش/مخفی کردن دکمه ها
	 */
	permissions?: string[]

	/**
	 * تنظیم کش صفحه؛ در صورت فعال بودن، صفحه کش می شود و دوباره بارگذاری نمی شود
	 * فقط در زمان فعال بودن تب ها موثر است
	 * @default true
	 */
	keepAlive?: boolean

	/**
	 * آیا در منو مخفی شود (برای مخفی کردن بعضی مسیرها از منوی کناری)
	 */
	hideInMenu?: boolean

	/**
	 * لینک iframe برای بارگذاری صفحه خارجی داخل iframe
	 */
	iframeLink?: string

	/**
	 * لینک خارجی که با کلیک در تب جدید باز می شود
	 */
	externalLink?: string

	/**
	 * آیا مجوز نادیده گرفته شود و دسترسی مستقیم داده شود
	 */
	ignoreAccess?: boolean

	/**
	 * @description تعیین منوی فعال؛ مناسب برای مسیرهای پویا که باید والد را فعال کنند
	 * @example از مسیر والد '/user/info' به مسیر فرزند '/user/info/1' می روید و برای برجسته شدن والد، '/user/info' را تنظیم می کنید
	 */
	currentActiveMenu?: string

	/**
	 * مسیر فعلی از API بک اند دریافت شده است
	 */
	backstage?: boolean
}

export type ReactRouterType = ReturnType<typeof RemixRouter>;
export type RouterSubscriber = Parameters<ReactRouterType["subscribe"]>[0];
export type RouterState = ReactRouterType["state"];
export type RouterNavigate = ReactRouterType["navigate"];

// استفاده از alias نوع برای استخراج نوع مشترک
export type RouteFileModule = Record<string, { default: AppRouteRecordRaw[] }>;
