import type {
	AccessServiceType,
	CompanyTypeOption,
	DomainCrudPermission,
	DomainCrudPermissionResponse,
	DomainPermissionAction,
	TrafficCompanyType,
	UserInfoType,
} from "#src/api/user/types";
import type { AppRouteRecordRaw } from "#src/router/types";

const TRAFFIC_SERVICE_CODE = "traffic";
const ALL_TRAFFIC_COMPANY_TYPES: CompanyTypeOption[] = [
	{ key: "COLLOCATION", value: "COLLOCATION" },
	{ key: "CP", value: "CP" },
	{ key: "IXP", value: "IXP" },
	{ key: "PREMIUM", value: "PREMIUM" },
	{ key: "TCI", value: "TCI" },
];

export type AdminAccessTarget = "users" | "roles" | "policies" | "audit_logs";

export function normalizeAccessKey(value?: string | null): string {
	return (value ?? "").trim().toLowerCase();
}

function normalizeTrafficCompanyType(value?: string | null): TrafficCompanyType | null {
	const normalized = (value ?? "").trim().toUpperCase();
	return normalized || null;
}

function toDomainCrudPermission(permission?: DomainCrudPermissionResponse): DomainCrudPermission | undefined {
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
		};
	}

	return permission;
}

export function getDomainPermission(
	permissions: Record<string, DomainCrudPermissionResponse> | undefined,
	domain: string,
): DomainCrudPermission | undefined {
	const normalizedDomain = normalizeAccessKey(domain);
	if (!normalizedDomain || !permissions) {
		return undefined;
	}

	for (const [domainKey, permission] of Object.entries(permissions)) {
		if (normalizeAccessKey(domainKey) === normalizedDomain) {
			return toDomainCrudPermission(permission);
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
			if (!Array.isArray(values)) {
				return null;
			}

			return values
				.flatMap((item) => {
					const [key, value] = Object.entries(item ?? {})[0] ?? [];
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
		if (!Array.isArray(values)) {
			return null;
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

function getCompanyTypePermissions(
	service: AccessServiceType,
	domain: string,
	action: DomainPermissionAction,
): CompanyTypeOption[] | null {
	const configuredTypes = getConfiguredCompanyTypePermissions(service, domain, action);
	if (configuredTypes) {
		return configuredTypes;
	}

	if (normalizeAccessKey(service.code) === TRAFFIC_SERVICE_CODE) {
		return ALL_TRAFFIC_COMPANY_TYPES;
	}

	return null;
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
		if (options.serviceId != null && service.id !== options.serviceId) {
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
		.map(service => service.id);
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
		(serviceId == null || service.id === serviceId)
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
	const normalizedRole = normalizeAccessKey(user.role ?? user.admin_role);
	const isSuperAdmin = user.is_superuser || normalizedRole === "superuser";
	if (isSuperAdmin) {
		return true;
	}

	const sectionByTarget: Record<AdminAccessTarget, string> = {
		users: "users",
		roles: "roles",
		policies: "notification_rules",
		audit_logs: "logs",
	};
	const section = sectionByTarget[target];
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
	switch (target) {
		case "users":
			return Boolean(user.can_manage_users || deputy?.can_create_users || deputy?.can_edit_users || deputy?.can_assign_roles);
		case "roles":
			return Boolean(user.can_manage_roles || deputy?.can_create_roles);
		case "policies":
			return Boolean(deputy?.can_manage_policies);
		case "audit_logs":
			return Boolean(user.is_staff || user.can_manage_users || user.can_manage_roles || deputy?.can_manage_policies);
		default:
			return false;
	}
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
		return hasDomainPermissionForServices(
			user.services,
			accessDomain,
			route.handle?.accessAction ?? "view",
		);
	}

	return true;
}
