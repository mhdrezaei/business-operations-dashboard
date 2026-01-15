import { useUserStore } from "#src/store";
import { isString } from "#src/utils";

import { useMatches } from "react-router";
import { accessControlCodes, AccessControlRoles } from "./constants";

export * from "./constants";

/**
 * @fa تشخيص مجوز
 * @en Access judgment
 */
export function useAccess() {
	const matches = useMatches();
	const { roles: userRoles } = useUserStore();
	const currentRoute = matches[matches.length - 1];

	/**
	 * @fa بررسي دسترسي مسير فعلي بر اساس کد مجوز
	 * @en Determine whether the current route has a specified permission based on permission codes
	 * @param permission نام مجوز به حروف کوچک يا آرايه اي از نام ها، مثل `["add", "delete"]`
	 * @returns boolean آيا مجوز مورد نظر وجود دارد
	 */
	const hasAccessByCodes = (permission?: string | Array<string>) => {
		if (!permission)
			return false;
		/** گرفتن تمام `code` هاي سطح دکمه از فيلد `handle` مسير فعلي */
		const metaAuth = currentRoute?.handle?.permissions;
		if (!metaAuth) {
			return false;
		}
		permission = isString(permission) ? [permission] : permission;
		permission = permission.map(item => item.toLowerCase());
		if (import.meta.env.DEV) {
			// اعتبارسنجي کدهاي مجوز؛ کد نامعتبر هشدار مي دهد
			for (const code of permission) {
				if (!Object.values(accessControlCodes).includes(code)) {
					console.warn(`[hasAccessByCodes]: '${code}' is not a valid permission code`);
				}
			}
		}
		const isAuth = metaAuth.some(item => permission.includes(item.toLowerCase()));
		return isAuth;
	};

	/**
	 * @fa تشخيص دسترسي کاربر بر اساس نقش؛ در اين سيستم با شناسه نقش بررسي مي شود
	 * @en Determine whether the current user has a specified permission based on roles
	 * @param roles نام نقش به حروف کوچک يا آرايه اي از نام ها، مثل `["admin", "super", "user"]`
	 * @returns boolean آيا مجوز مورد نظر وجود دارد
	 */
	const hasAccessByRoles = (roles?: string | Array<string>) => {
		if (!roles || !userRoles) {
			return false;
		}
		roles = isString(roles) ? [roles] : roles;
		roles = roles.map(item => item.toLowerCase());
		if (import.meta.env.DEV) {
			// اعتبارسنجي نقش ها؛ نقش نامعتبر هشدار مي دهد
			for (const roleItem of roles) {
				if (!Object.values(AccessControlRoles).includes(roleItem)) {
					console.warn(`[hasAccessByRoles]: '${roleItem}' is not a valid role`);
				}
			}
		}
		const isAuth = userRoles.some(item => roles.includes(item.toLowerCase()));
		return isAuth;
	};

	return { hasAccessByCodes, hasAccessByRoles };
}
