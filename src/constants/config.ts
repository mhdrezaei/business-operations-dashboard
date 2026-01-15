import type { TFunction } from "i18next";

/**
 * @description: تنظيمات
 */
export const TOKEN = "admin_token"; // نام token
export const LANG = "lang"; // زبان
export const EMPTY_VALUE = "-"; // نمايش مقدار خالي

// مقادير پيش فرض کامپوننت هاي عمومي
export const MAX_TAG_COUNT = "responsive"; // حداکثر تعداد برچسب، responsive: تطبيقي

// قالب تاريخ
export const DATE_FORMAT = "YYYY-MM-DD";
export const TIME_FORMAT = "YYYY-MM-DD hh:mm:ss";

// مقادير اوليه صفحه بندي
export const INITIAL_PAGINATION = {
	current: 1,
	pageSize: 20,
};

// عنوان افزودن/ويرايش
export const ADD_TITLE = (t: TFunction, title?: string) => t("public.createTitle", { title: title ?? "" });
export const EDIT_TITLE = (t: TFunction, name: string, title?: string) => `${t("public.editTitle", { title: title ?? "" })}${name ? `(${name})` : ""}`;
