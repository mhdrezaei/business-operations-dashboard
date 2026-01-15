import type { RoleItemType } from "./types";
import { request } from "#src/utils";

export * from "./types";

/* دريافت فهرست نقش ها */
export function fetchRoleList(data: any) {
	return request.get<ApiListResponse<RoleItemType>>("role-list", { searchParams: data, ignoreLoading: true }).json();
}

/* افزودن نقش */
export function fetchAddRoleItem(data: RoleItemType) {
	return request.post<ApiResponse<string>>("role-item", { json: data, ignoreLoading: true }).json();
}

/* ويرايش نقش */
export function fetchUpdateRoleItem(data: RoleItemType) {
	return request.put<ApiResponse<string>>("role-item", { json: data, ignoreLoading: true }).json();
}

/* حذف نقش */
export function fetchDeleteRoleItem(id: number) {
	return request.delete<ApiResponse<string>>("role-item", { json: id, ignoreLoading: true }).json();
}

/* دريافت منو */
export function fetchRoleMenu() {
	return request.get<ApiResponse<RoleItemType[]>>("role-menu", { ignoreLoading: true }).json();
}

/* شناسه منوي متصل به نقش */
export function fetchMenuByRoleId(data: { id: number }) {
	return request.get<ApiResponse<string[]>>("menu-by-role-id", { searchParams: data, ignoreLoading: false }).json();
}
