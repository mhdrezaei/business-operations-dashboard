/**
 * مديريت متمرکز ثابت هاي مجوز براي جلوگيري از رشته هاي ثابت و نگهداري آسان تر
 */

/**
 * پيشوند مجوز دکمه
 */
export const permissionPrefix = "permission:button";

/**
 * مجوزهاي رايج دکمه:
 * - get: دريافت
 * - update: به روزرساني
 * - delete: حذف
 * - add: افزودن
 */
export const accessControlCodes = {
	get: `${permissionPrefix}:get`,
	update: `${permissionPrefix}:update`,
	delete: `${permissionPrefix}:delete`,
	add: `${permissionPrefix}:add`,
};

export const AccessControlRoles = {
	admin: "admin",
	common: "common",
	// user: "user",
};
