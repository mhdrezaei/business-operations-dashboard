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
	 * عنوان مسير، معمولا براي عنوان صفحه يا نمايش در منوي کناري
	 */
	title: ReactNode

	/**
	 * آيکن منو براي نمايش در منوي کناري
	 */
	icon?: ReactNode

	/**
	 * ترتيب منو براي کنترل ترتيب نمايش در منوي کناري
	 */
	order?: number

	/**
	 * پیکربندي مجوز صفحه؛ فقط کاربران داراي مجوز مي توانند دسترسي داشته باشند
	 */
	roles?: string[]

	/**
	 * مجوز سطح دکمه در صفحه براي نمايش/مخفي کردن دکمه ها
	 */
	permissions?: string[]

	/**
	 * تنظيم کش صفحه؛ در صورت فعال بودن، صفحه کش مي شود و دوباره بارگذاري نمي شود
	 * فقط در زمان فعال بودن تب ها موثر است
	 * @default true
	 */
	keepAlive?: boolean

	/**
	 * آيا در منو مخفي شود (براي مخفي کردن بعضي مسيرها از منوي کناري)
	 */
	hideInMenu?: boolean

	/**
	 * لينک iframe براي بارگذاري صفحه خارجي داخل iframe
	 */
	iframeLink?: string

	/**
	 * لينک خارجي که با کليک در تب جديد باز مي شود
	 */
	externalLink?: string

	/**
	 * آيا مجوز ناديده گرفته شود و دسترسي مستقيم داده شود
	 */
	ignoreAccess?: boolean

	/**
	 * @description تعيين منوي فعال؛ مناسب براي مسيرهاي پويا که بايد والد را فعال کنند
	 * @example از مسير والد '/user/info' به مسير فرزند '/user/info/1' مي رويد و براي برجسته شدن والد، '/user/info' را تنظيم مي کنيد
	 */
	currentActiveMenu?: string

	/**
	 * مسير فعلي از API بک اند دريافت شده است
	 */
	backstage?: boolean
}

export type ReactRouterType = ReturnType<typeof RemixRouter>;
export type RouterSubscriber = Parameters<ReactRouterType["subscribe"]>[0];
export type RouterState = ReactRouterType["state"];
export type RouterNavigate = ReactRouterType["navigate"];

// استفاده از alias نوع براي استخراج نوع مشترک
export type RouteFileModule = Record<string, { default: AppRouteRecordRaw[] }>;
