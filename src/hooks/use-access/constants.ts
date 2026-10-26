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

/**
 * Domain names as used in services[].permissions from `/audit/access/`.
 * Use these constants instead of string literals for compile-time safety.
 */
export const AccessDomains = {
	companyProfile: "company_profile",
	contractTemplate: "contract_template",
	contracts: "contracts",
	performances: "performances",
	predictions: "predictions",
} as const;

/**
 * Permission action constants matching backend values.
 * CRUD actions apply to all domains; `sign` and `businessApprove` only for contracts.
 */
export const PermissionActions = {
	view: "view",
	create: "create",
	update: "update",
	delete: "delete",
	/** Contract-only: department sign-off */
	sign: "sign",
	/** Contract-only: business/commercial approval */
	businessApprove: "business_approve",
} as const;

/**
 * Company profile card codes for `company_visible_cards` checks.
 */
export const CompanyCardCodes = {
	bankAccounts: "company_bank_accounts",
	documents: "company_documents",
	financeProfiles: "company_finance_profiles",
	internalProfiles: "company_internal_profiles",
	legalProfiles: "company_legal_profiles",
	people: "company_people",
	publicProfiles: "company_public_profiles",
	shareholders: "company_shareholders",
} as const;

/**
 * Admin panel section identifiers from `admin_sections` / `admin_section_actions`.
 */
export const AdminSections = {
	users: "users",
	roles: "roles",
	serviceAdmins: "service_admins",
	logs: "logs",
	notificationRules: "notification_rules",
} as const;
