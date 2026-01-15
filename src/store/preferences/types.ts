import type {
	MIXED_NAVIGATION,
	SIDE_NAVIGATION,
	TOP_NAVIGATION,
	TWO_COLUMN_NAVIGATION,
} from "#src/layout/widgets/preferences/blocks/layout/constants";

import type { LanguageType } from "#src/locales";
import type { MenuProps } from "antd";

/**
 * @fa چيدمان صفحه ورود
 * @en Login page layout
 */
export type PageLayoutType = "layout-left" | "layout-center" | "layout-right";
/**
 * @fa سبک نوار تب
 * @en Tabbar style
 */
export type TabsStyleType = "brisk" | "card" | "chrome" | "plain";

/**
 * @fa نوع تم
 * @en Theme type
 */
export type ThemeType = "dark" | "light" | "auto";

/**
 * @fa نوع انيميشن
 * @en Animation type
 */
interface AnimationState {
	/**
	 * @fa آيا انيميشن گذار فعال است
	 * @en Whether to enable transition animation
	 * @default true
	 */
	transitionProgress: boolean
	/**
	 * @fa آيا انيميشن بارگذاري فعال است
	 * @en Whether to enable loading animation
	 * @default true
	 */
	transitionLoading: boolean
	/**
	 * @fa آيا انيميشن فعال است
	 * @en Whether to enable animation
	 * @default true
	 */
	transitionEnable: boolean
	/**
	 * @fa نام انيميشن گذار
	 * @en Transition animation name
	 * @default "fade-slide"
	 */
	transitionName: string
}

export type NavigationType =
  | typeof SIDE_NAVIGATION
  | typeof TOP_NAVIGATION
  | typeof TWO_COLUMN_NAVIGATION
  | typeof MIXED_NAVIGATION;
export type BuiltinThemeType =
  | "red"
  | "volcano"
  | "orange"
  | "gold"
  | "yellow"
  | "lime"
  | "green"
  | "cyan"
  | "blue"
  | "geekblue"
  | "purple"
  | "magenta"
  | "gray"
  | "custom";

export type HeaderBackgroundType =
  | "red"
  | "volcano"
  | "orange"
  | "gold"
  | "yellow"
  | "lime"
  | "green"
  | "cyan"
  | "blue"
  | "geekblue"
  | "purple"
  | "magenta"
  | "gray"
  | "custom"
  | "default";

interface LayoutState {
	navigationStyle: NavigationType
	/**
	 * @fa نوع رنگ پس زمينه نوار بالا
	 * @en Header background color type for top navigation
	 * @default "default"
	 */
	headerBackgroundType: HeaderBackgroundType
	/**
	 * @fa رنگ پس زمينه سفارشي نوار بالا
	 * @en Custom header background color for top navigation
	 * @default "#1677ff"
	 */
	headerBackgroundColor: string
	/**
	 * @fa ارتفاع نوار بالا
	 * @en Header height in pixels
	 * @default 56
	 */
	headerHeight: number
}

export interface GeneralState {
	/**
	 * @fa آيا واترمارک فعال است
	 * @en Whether to enable watermark
	 * @default false
	 */
	watermark: boolean
	/**
	 * @fa محتواي واترمارک
	 * @en Watermark content
	 * @default ""
	 */
	watermarkContent: string
	/**
	 * @fa دکمه بازگشت به بالاي صفحه
	 * @en BackTop makes it easy to go back to the top of the page.
	 * @default true
	 */
	enableBackTopButton: boolean
	/**
	 * @fa پیکربندي چيدمان صفحه ورود
	 * @en Login page layout configuration
	 * @default "layout-right"
	 */
	pageLayout: PageLayoutType
	/**
	 * @fa فعال سازي مجوز مسير فرانت اند
	 * @en Enable frontend route permissions
	 * @default false
	 */
	enableFrontendAceess: boolean
	/**
	 * @fa فعال سازي مجوز مسير بک اند
	 * @en Enable backend route permissions
	 * @default true
	 */
	enableBackendAccess: boolean

	/**
	 * @fa زبان فعلي
	 * @en Current language
	 * @default "fa-IR"
	 */
	language: LanguageType
	/**
	 * @fa فعال سازي عنوان پويا
	 * @en Whether to enable dynamic title
	 * @default true
	 */
	enableDynamicTitle: boolean
	/**
	 * @fa فعال سازي بررسي به روزرساني
	 * @en Whether to enable update check
	 * @default true
	 */
	enableCheckUpdates: boolean
	/**
	 * @fa زمان پويش، واحد: دقيقه، پيش فرض 1 دقيقه
	 * @en Polling time, unit: minute, default 1 minute
	 * @default 1
	 */
	checkUpdatesInterval: number
}

export interface SidebarState {
	/**
	 * نمايش سایدبار
	 * @default true
	 */
	sidebarEnable?: boolean
	/**
	 * عرض منوي کناري
	 * @default 210
	 */
	sidebarWidth: number
	/**
	 * عرض منوي جمع شده
	 * @default 56
	 */
	sideCollapsedWidth: number
	/**
	 * وضعيت جمع شدگي منوي کناري
	 * @default false
	 */
	sidebarCollapsed: boolean
	/**
	 * نمايش عنوان هنگام جمع شدن منو
	 * @default true
	 */
	sidebarCollapseShowTitle: boolean
	/**
	 * عرض اضافي در حالت جمع شده
	 * @default 48
	 */
	sidebarExtraCollapsedWidth: number
	/**
	 * عرض ستون اول در چيدمان دو ستونه
	 * @default 80
	 */
	firstColumnWidthInTwoColumnNavigation: number
	/**
	 * تم سایدبار
	 * @default dark
	 */
	sidebarTheme: MenuProps["theme"]
	/**
	 * @fa حالت آکاردئون براي منوي ناوبري
	 * @en Accordion mode of navigation menu
	 */
	accordion: boolean
}

export interface FooterState {
	enableFooter: boolean
	fixedFooter: boolean
	companyName: string
	companyWebsite: string
	copyrightDate: string
	ICPNumber: string
	ICPLink: string
}

export interface PreferencesState
	extends AnimationState,
	LayoutState,
	GeneralState,
	SidebarState,
	FooterState {
	/* ================== Theme ================== */
	/**
	 * @fa تم فعلي
	 * @en Current theme
	 * @default "auto"
	 */
	theme: ThemeType
	/**
	 * @fa فعال سازي حالت کوررنگي
	 * @en Whether to enable color-blind mode
	 * @default false
	 */
	colorBlindMode: boolean
	/**
	 * @fa فعال سازي حالت خاکستري
	 * @en Whether to enable gray mode
	 * @default false
	 */
	colorGrayMode: boolean
	/**
	 * @fa مقدار گردي گوشه هاي تم
	 * @en Theme radius value
	 * @default 6
	 */
	themeRadius: number
	/**
	 * @fa رنگ تم
	 * @en Theme color
	 * @default "#1677ff" - blue
	 */
	themeColorPrimary: string
	/**
	 * @fa تم داخلي
	 * @en Builtin theme
	 * @default "blue"
	 */
	builtinTheme: BuiltinThemeType
	/* ================== Theme ================== */

	/* ================== Tabbar ================== */
	/**
	 * @fa سبک تب بار
	 * @en Tabbar style
	 * @default "chrome"
	 */
	tabbarStyleType: TabsStyleType
	/**
	 * @fa فعال سازي تب بار
	 * @en Whether to enable tabbar
	 * @default true
	 */
	tabbarEnable: boolean
	/**
	 * @fa نمايش آيکن تب بار
	 * @en Whether to show tabbar icon
	 * @default true
	 * @todo در انتظار پياده سازي
	 */
	tabbarShowIcon: boolean
	/**
	 * @fa پايداري تب بار
	 * @en Whether to persist tabbar
	 * @default true
	 */
	tabbarPersist: boolean
	/**
	 * @fa قابليت درگ تب بار
	 * @en Whether to drag tabbar
	 * @default true
	 * @todo در انتظار پياده سازي
	 */
	tabbarDraggable: boolean
	/**
	 * @fa نمايش بيشتر
	 * @en Whether to show more
	 * @default true
	 */
	tabbarShowMore: boolean
	/**
	 * @fa نمايش بيشينه
	 * @en Whether to show maximize
	 * @default true
	 */
	tabbarShowMaximize: boolean
	/* ================== Tabbar ================== */
}
