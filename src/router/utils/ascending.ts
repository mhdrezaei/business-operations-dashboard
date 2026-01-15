import type { AppRouteRecordRaw } from "#src/router/types";

/** مرتب سازي مسيرها بر اساس order به صورت صعودي */
export function ascending(arr: AppRouteRecordRaw[]) {
	return arr.map((routeItem, routeIndex) => ({
		...routeItem,
		handle: {
			...routeItem.handle,
			// اگر order وجود ندارد، بر اساس ترتيب ايجاد مي شود
			order: routeItem?.handle?.order || routeIndex + 2,
		},
	})).sort(
		(a, b) => {
			return a?.handle?.order - b?.handle?.order;
		},
	);
}
