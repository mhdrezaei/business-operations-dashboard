import type { MenuItemType } from "./types";
import { request } from "#src/utils";

export * from "./types";

/* دريافت فهرست منو */
export function fetchMenuList(data: any) {
	return request.get<ApiListResponse<MenuItemType>>("menu-list", { searchParams: data, ignoreLoading: true }).json();
}

/* افزودن منو */
export function fetchAddMenuItem(data: MenuItemType) {
	return request.post<ApiResponse<string>>("menu-item", { json: data, ignoreLoading: true }).json();
}

/* ويرايش منو */
export function fetchUpdateMenuItem(data: MenuItemType) {
	return request.put<ApiResponse<string>>("menu-item", { json: data, ignoreLoading: true }).json();
}

/* حذف منو */
export function fetchDeleteMenuItem(id: number) {
	return request.delete<ApiResponse<string>>("menu-item", { json: id, ignoreLoading: true }).json();
}
