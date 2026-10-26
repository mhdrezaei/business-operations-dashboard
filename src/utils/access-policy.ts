import type {
	AccessServiceType,
	CompanyTypeOption,
	CrudAction,
	DeputyPermissionsType,
	DomainPermission,
	DomainPermissionAction,
	DomainPermissionResponse,
	TrafficCompanyType,
	UserInfoType,
} from "#src/api/user/types";
import type { AppRouteRecordRaw } from "#src/router/types";

const TRAFFIC_SERVICE_CODE = "traffic";

export type AdminAccessTarget = "users" | "roles" | "policies" | "audit_logs" | "service_admins" | "logs" | "notification_rules";

function normalizeServiceId(value: unknown): number | null {
	const normalized = Number(value);
	return Number.isFinite(normalized) ? normalized : null;
}

export function normalizeAccessKey(value?: string | null): string {
	return (value ?? "").trim().toLowerCase();
}

function normalizeTrafficCompanyType(value?: string | null): TrafficCompanyType | null {
	const normalized = (value ?? "").trim().toUpperCase();
	return normalized || null;
}

function toDomainPermission(permission?: DomainPermissionResponse): DomainPermission | undefined {
	if (!permission) {
		return undefined;
	}

	if (Array.isArray(permission)) {
		const actions = permission.map(action => normalizeAccessKey(action));
		return {
			view: actions.includes("view"),
			create: actions.includes("create"),
			update: actions.includes("update"),
			delete: actions.includes("delete"),
			sign: actions.includes("sign"),
			business_approve: actions.includes("business_approve"),
		};
	}

	// Legacy object format — normalize to include all fields
	return {
		view: Boolean(permission.view),
		create: Boolean(permission.create),
		update: Boolean(permission.update),
		delete: Boolean(permission.delete),
		sign: Boolean(permission.sign),
		business_approve: Boolean(permission.business_approve),
	};
}

export function getDomainPermission(
	permissions: Record<string, DomainPermissionResponse> | undefined,
	domain: string,
): DomainPermission | undefined {
	const normalizedDomain = normalizeAccessKey(domain);
	if (!normalizedDomain || !permissions) {
		return undefined;
	}

	for (const [domainKey, permission] of Object.entries(permissions)) {
		if (normalizeAccessKey(domainKey) === normalizedDomain) {
			return toDomainPermission(permission);
		}
	}
	return undefined;
}

function getConfiguredCompanyTypePermissions(
	service: AccessServiceType,
	domain: string,
	action: DomainPermissionAction,
): CompanyTypeOption[] | null {
	const normalizedDomain = normalizeAccessKey(domain);
	const companyTypePermissions = service.company_type_permissions;
	if (companyTypePermissions) {
		for (const [domainKey, actionMap] of Object.entries(companyTypePermissions)) {
			if (normalizeAccessKey(domainKey) !== normalizedDomain) {
				continue;
			}

			const values = actionMap?.[action];
			if (values === undefined) {
				return null;
			}
			if (!Array.isArray(values)) {
				return [];
			}

			return values
				.flatMap((item) => {
					let key: string | undefined;
					let value: string | undefined;

					if (typeof item === "string") {
						key = item;
						value = item;
					}
					else if (item && typeof item === "object") {
						const entry = Object.entries(item)[0];
						if (entry) {
							key = entry[0];
							value = typeof entry[1] === "string" ? entry[1] : entry[0];
						}
					}

					const normalizedKey = normalizeTrafficCompanyType(key);
					if (!normalizedKey) {
						return [];
					}

					return [{
						key: normalizedKey,
						value: typeof value === "string" && value.trim() ? value : normalizedKey,
					} satisfies CompanyTypeOption];
				});
		}
	}

	const permissions = service.traffic_company_type_permissions;
	if (!permissions) {
		return null;
	}

	for (const [domainKey, actionMap] of Object.entries(permissions)) {
		if (normalizeAccessKey(domainKey) !== normalizedDomain) {
			continue;
		}

		const values = actionMap?.[action];
		if (values === undefined) {
			return null;
		}
		if (!Array.isArray(values)) {
			return [];
		}

		return values
			.map((item) => {
				const normalizedKey = normalizeTrafficCompanyType(item);
				if (!normalizedKey) {
					return null;
				}

				return {
					key: normalizedKey,
					value: normalizedKey,
				} satisfies CompanyTypeOption;
			})
			.filter((item): item is CompanyTypeOption => Boolean(item));
	}

	return null;
}

/**
 * Get permitted company types for a specific (service, domain, action) triple.
 * Returns `null` if the service doesn't use company type restrictions for this domain/action
 * (meaning all company types are allowed). Returns empty array if configured but no types match.
 *
 * Company type data is fully driven by the backend `company_type_permissions` field.
 * Only relevant for services: traffic, sms, psp, telecom_frame, sales_agency.
 */
function getCompanyTypePermissions(
	service: AccessServiceType,
	domain: string,
	action: DomainPermissionAction,
): CompanyTypeOption[] | null {
	return getConfiguredCompanyTypePermissions(service, domain, action);
}

function hasCompanyTypePermission(
	service: AccessServiceType,
	domain: string,
	action: DomainPermissionAction,
	trafficCompanyType?: string | null,
): boolean {
	const permittedTypes = getCompanyTypePermissions(service, domain, action);
	if (!permittedTypes) {
		return true;
	}

	if (!trafficCompanyType) {
		return permittedTypes.length > 0;
	}

	const normalizedType = normalizeTrafficCompanyType(trafficCompanyType);
	return Boolean(normalizedType && permittedTypes.some(item => item.key === normalizedType));
}

export function hasDomainPermissionForServices(
	services: UserInfoType["services"],
	domain: string | undefined,
	action: DomainPermissionAction = "view",
	options: {
		serviceCode?: string | null
		serviceId?: number | null
		trafficCompanyType?: string | null
	} = {},
): boolean {
	const normalizedDomain = normalizeAccessKey(domain);
	if (!normalizedDomain || !services?.length) {
		return false;
	}

	const normalizedServiceCode = normalizeAccessKey(options.serviceCode);

	return services.some((service) => {
		if (options.serviceId != null && normalizeServiceId(service.id) !== normalizeServiceId(options.serviceId)) {
			return false;
		}
		if (normalizedServiceCode && normalizeAccessKey(service.code) !== normalizedServiceCode) {
			return false;
		}

		const permission = getDomainPermission(service.permissions, normalizedDomain);
		if (!permission?.[action]) {
			return false;
		}

		return hasCompanyTypePermission(service, normalizedDomain, action, options.trafficCompanyType);
	});
}

/** Like {@link hasDomainPermissionForServices}, but any one of the given actions is enough. */
export function hasAnyDomainPermissionForServices(
	services: UserInfoType["services"],
	domain: string | undefined,
	actions: DomainPermissionAction | DomainPermissionAction[],
	options: Parameters<typeof hasDomainPermissionForServices>[3] = {},
): boolean {
	return [actions].flat().some(action => hasDomainPermissionForServices(services, domain, action, options));
}

export function getPermittedServiceIdsForDomain(
	services: UserInfoType["services"],
	domain: string | undefined,
	action: DomainPermissionAction = "view",
): number[] {
	const normalizedDomain = normalizeAccessKey(domain);
	if (!normalizedDomain || !services?.length) {
		return [];
	}

	return services
		.filter(service => hasDomainPermissionForServices(services, normalizedDomain, action, { serviceId: service.id }))
		.map(service => normalizeServiceId(service.id))
		.filter((serviceId): serviceId is number => serviceId != null);
}

export function getPermittedServiceCodesForDomain(
	services: UserInfoType["services"],
	domain: string | undefined,
	action: DomainPermissionAction = "view",
): string[] {
	const normalizedDomain = normalizeAccessKey(domain);
	if (!normalizedDomain || !services?.length) {
		return [];
	}

	const codes = services
		.filter(service => hasDomainPermissionForServices(services, normalizedDomain, action, { serviceId: service.id }))
		.map(service => normalizeAccessKey(service.code))
		.filter(Boolean);

	return Array.from(new Set(codes));
}

export function getPermittedCompanyTypesForDomain(
	services: UserInfoType["services"],
	domain: string | undefined,
	action: DomainPermissionAction = "view",
	serviceId?: number | null,
): CompanyTypeOption[] {
	const targetServices = (services ?? []).filter(service =>
		(serviceId == null || normalizeServiceId(service.id) === normalizeServiceId(serviceId))
		&& Boolean(getDomainPermission(service.permissions, domain ?? "")?.[action]),
	);

	if (!targetServices.length) {
		return [];
	}

	const permittedTypes = new Map<string, CompanyTypeOption>();
	for (const service of targetServices) {
		const types = getCompanyTypePermissions(service, domain ?? "", action) ?? [];
		types.forEach((type) => {
			if (!permittedTypes.has(type.key)) {
				permittedTypes.set(type.key, type);
			}
		});
	}

	return [...permittedTypes.values()];
}

export function getPermittedTrafficCompanyTypesForDomain(
	services: UserInfoType["services"],
	domain: string | undefined,
	action: DomainPermissionAction = "view",
	serviceId?: number | null,
): TrafficCompanyType[] {
	return getPermittedCompanyTypesForDomain(
		(services ?? []).filter(service => normalizeAccessKey(service.code) === TRAFFIC_SERVICE_CODE),
		domain,
		action,
		serviceId,
	).map(item => item.key);
}

type AdminIdentity = Pick<UserInfoType, "role" | "admin_role" | "is_superuser" | "is_staff">;

const ADMIN_SECTION_BY_TARGET: Record<string, string> = {
	users: "users",
	roles: "roles",
	policies: "notification_rules",
	notification_rules: "notification_rules",
	audit_logs: "logs",
	logs: "logs",
	service_admins: "service_admins",
};

/** Audit logs and notification/sign-flow rules are for full admins only (old `requireSuperadmin`). */
const FULL_ADMIN_ONLY_SECTIONS = new Set(["logs", "notification_rules"]);

function resolveAdminSection(target: AdminAccessTarget): string {
	const normalizedTarget = normalizeAccessKey(target);
	return ADMIN_SECTION_BY_TARGET[normalizedTarget] ?? normalizedTarget;
}

const DEPUTY_PERMISSION_ALIASES: Record<string, keyof DeputyPermissionsType> = {
	create_users: "can_create_users",
	can_create_users: "can_create_users",
	create_roles: "can_create_roles",
	can_create_roles: "can_create_roles",
	edit_users: "can_edit_users",
	can_edit_users: "can_edit_users",
	assign_roles: "can_assign_roles",
	can_assign_roles: "can_assign_roles",
	manage_policies: "can_manage_policies",
	can_manage_policies: "can_manage_policies",
};

/** `/audit/access/` sends the granted deputy capabilities as a string list; the UI works with boolean flags. */
export function normalizeDeputyPermissions(raw?: DeputyPermissionsType | string[] | null): DeputyPermissionsType {
	const normalized: DeputyPermissionsType = {
		can_create_users: false,
		can_create_roles: false,
		can_edit_users: false,
		can_assign_roles: false,
		can_manage_policies: false,
	};
	const entries: Array<[string, unknown]> = Array.isArray(raw)
		? raw.map(item => [item, true])
		: Object.entries(raw ?? {});
	for (const [key, value] of entries) {
		const flag = DEPUTY_PERMISSION_ALIASES[normalizeAccessKey(key)];
		if (flag) {
			normalized[flag] = Boolean(value);
		}
	}
	return normalized;
}

/** superuser / staff_admin / Django is_staff: full access to everything (old `isFullAdmin`). */
export function isFullAdmin(user: AdminIdentity): boolean {
	const normalizedRole = normalizeAccessKey(user.role ?? user.admin_role);
	return Boolean(user.is_superuser || user.is_staff || normalizedRole === "superuser" || normalizedRole === "staff_admin");
}

export type AdminCapability = "assign_roles" | "manage_deputies";

/**
 * User-management capabilities that are not plain CRUD actions (old `canAssignRoles` / `canManageDeputies`):
 * full admins and service admins have all of them, a deputy only the granted ones.
 */
export function hasAdminCapability(
	user: AdminIdentity & Pick<UserInfoType, "is_service_admin" | "deputy_permissions">,
	capability: AdminCapability,
): boolean {
	if (isFullAdmin(user) || user.is_service_admin || normalizeAccessKey(user.role ?? user.admin_role) === "service_admin") {
		return true;
	}
	return capability === "assign_roles" && Boolean(user.deputy_permissions?.can_assign_roles);
}

export function hasAdminAccess(user: Pick<
	UserInfoType,
	| "role"
	| "admin_role"
	| "admin_sections"
	| "admin_section_actions"
	| "is_superuser"
	| "is_staff"
	| "can_manage_users"
	| "can_manage_roles"
	| "deputy_permissions"
>, target: AdminAccessTarget): boolean {
	if (isFullAdmin(user)) {
		return true;
	}

	const section = resolveAdminSection(target);
	if (FULL_ADMIN_ONLY_SECTIONS.has(section)) {
		return false;
	}

	const normalizedSections = (user.admin_sections ?? []).map(normalizeAccessKey);
	const sectionActions = user.admin_section_actions ?? {};
	for (const [sectionKey, actions] of Object.entries(sectionActions)) {
		if (normalizeAccessKey(sectionKey) === section && Array.isArray(actions) && actions.length > 0) {
			return true;
		}
	}
	if (normalizedSections.includes(section)) {
		return true;
	}

	const deputy = user.deputy_permissions;
	switch (section) {
		case "users":
		case "service_admins":
			return Boolean(user.can_manage_users || deputy?.can_create_users || deputy?.can_edit_users || deputy?.can_assign_roles);
		case "roles":
			return Boolean(user.can_manage_roles || deputy?.can_create_roles);
		default:
			return false;
	}
}

/**
 * Check if the user has a specific CRUD action within an admin section.
 * Unlike {@link hasAdminAccess} which checks for ANY access (route/menu visibility),
 * this checks for a specific action (button-level control).
 *
 * @example
 * hasAdminSectionAction(user, "users", "create") // Can this user create new users?
 * hasAdminSectionAction(user, "roles", "update") // Can this user edit roles?
 */
export function hasAdminSectionAction(
	user: Pick<
		UserInfoType,
		| "role"
		| "admin_role"
		| "is_superuser"
		| "is_staff"
		| "admin_section_actions"
		| "can_manage_users"
		| "can_manage_roles"
		| "deputy_permissions"
	>,
	target: AdminAccessTarget,
	action: CrudAction,
): boolean {
	if (isFullAdmin(user)) {
		return true;
	}

	const section = resolveAdminSection(target);
	if (FULL_ADMIN_ONLY_SECTIONS.has(section)) {
		return false;
	}

	const normalizedAction = normalizeAccessKey(action);
	const sectionActions = user.admin_section_actions ?? {};

	for (const [sectionKey, actions] of Object.entries(sectionActions)) {
		if (normalizeAccessKey(sectionKey) === section && Array.isArray(actions)) {
			return actions.map(a => normalizeAccessKey(a)).includes(normalizedAction);
		}
	}

	const deputy = (user as Partial<UserInfoType>).deputy_permissions;
	if (section === "users") {
		if (normalizedAction === "create")
			return Boolean(deputy?.can_create_users);
		if (normalizedAction === "update")
			return Boolean(deputy?.can_edit_users || deputy?.can_assign_roles);
		if (normalizedAction === "delete")
			return Boolean(user.can_manage_users);
		if (normalizedAction === "view")
			return Boolean(user.can_manage_users || deputy?.can_create_users || deputy?.can_edit_users || deputy?.can_assign_roles);
	}
	if (section === "roles") {
		if (normalizedAction === "create")
			return Boolean(deputy?.can_create_roles);
		if (normalizedAction === "update" || normalizedAction === "delete")
			return Boolean(user.can_manage_roles);
		if (normalizedAction === "view")
			return Boolean(user.can_manage_roles || deputy?.can_create_roles);
	}
	if (section === "service_admins") {
		if (normalizedAction === "view")
			return Boolean(user.can_manage_users);
	}

	return false;
}

export function hasRouteAccess(route: AppRouteRecordRaw, user: UserInfoType): boolean {
	if (route.handle?.ignoreAccess === true) {
		return true;
	}

	const routeRoles = route.handle?.roles;
	if (routeRoles?.length) {
		const userRoles = user.roles ?? [];
		if (!userRoles.some(role => routeRoles.includes(role))) {
			return false;
		}
	}

	if (route.handle?.adminAccess && !hasAdminAccess(user, route.handle.adminAccess)) {
		return false;
	}

	const accessDomain = route.handle?.accessDomain;
	if (accessDomain) {
		const normalizedDomain = normalizeAccessKey(accessDomain);
		if (Array.isArray(user.domains) && user.domains.length > 0 && !user.domains.map(normalizeAccessKey).includes(normalizedDomain)) {
			return false;
		}

		return hasAnyDomainPermissionForServices(
			user.services,
			accessDomain,
			route.handle?.accessAction ?? "view",
			{
				serviceCode: route.handle?.serviceCode,
			},
		);
	}

	return true;
}
