/**
 * Layout Header Height
 */
export const headerHeight = 48;

/**
 * Layout Footer Height
 */
export const footerHeight = 40;

/**
 * Sidebar Title Height
 */
export const sidebarTitleHeight = 52;

/**
 * Sider Trigger Height
 */
export const siderTriggerHeight = 40;

/**
 * Tabbar Height Height
 */
export const tabbarHeight = 56;

/**
 * @fa نام فضاي پيش فرض
 * @en Default namespace
 */
export const DEFAULT_NAMESPACE = "react-antd-admin";

/**
 * @fa شناسه عنصر ناحيه محتواي اصلي
 * @en Main content element ID
 */
export const ELEMENT_ID_MAIN_CONTENT = `__${DEFAULT_NAMESPACE}_main_content`;

/**
 * @fa عنصری که ناحیه محتوا داخل آن اسکرول می‌شود (برای sticky و دکمه بازگشت به بالا)
 * @en The element the main content scrolls in (used by sticky headers and the back-to-top button)
 */
export function getMainScrollContainer() {
	return document.querySelector<HTMLElement>(`#${ELEMENT_ID_MAIN_CONTENT} .simplebar-content-wrapper`) ?? document.body;
}

/**
 * @fa ارتفاع کامپوننت layout content
 * @en Height of the layout content component
 */
export const CSS_VARIABLE_LAYOUT_CONTENT_HEIGHT = `--${DEFAULT_NAMESPACE}-content-height`;
/**
 * @fa عرض کامپوننت layout content
 * @en Width of the layout content component
 */
export const CSS_VARIABLE_LAYOUT_CONTENT_WIDTH = `--${DEFAULT_NAMESPACE}-content-width`;
/**
 * @fa ارتفاع کامپوننت layout header
 * @en Height of the layout header component
 */
export const CSS_VARIABLE_LAYOUT_HEADER_HEIGHT = `--${DEFAULT_NAMESPACE}-header-height`;
/**
 * @fa ارتفاع کامپوننت layout footer
 * @en Height of the layout footer component
 */
export const CSS_VARIABLE_LAYOUT_FOOTER_HEIGHT = `--${DEFAULT_NAMESPACE}-footer-height`;
