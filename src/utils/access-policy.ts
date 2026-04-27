import type {
	AccessServiceType,
	DomainCrudPermission,
	DomainPermissionAction,
	TrafficCompanyType,
	UserInfoType,
} from "#src/api/user/types";
import type { AppRouteRecordRaw } from "#src/router/types";

const TRAFFIC_SERVICE_CODE = "traffic";
const ALL_TRAFFIC_COMPANY_TYPES: TrafficCompanyType[] = ["CP", "IXP", "PREMIUM", "TCI"];

export type AdminAccessTarget = "users" | "roles" | "policies" | "audit_logs";

export function normalizeAccessKey(value?: string | null): string {
	return (value ?? "").trim().toLowerCase();
}

function normalizeTrafficCompanyType(value?: string | null): TrafficCompanyType | null {
	const normalized = (value ?? "").trim().toUpperCase();
	if (ALL_TRAFFIC_COMPANY_TYPES.includes(normalized as TrafficCompanyType)) {
		return normalized as TrafficCompanyType;
	}
	return null;
}

export function getDomainPermission(
	permissions: Record<string, DomainCrudPermission> | undefined,
	domain: string,
): DomainCrudPermission | undefined {
	const normalizedDomain = normalizeAccessKey(domain);
	if (!normalizedDomain || !permissions) {
		return undefined;
	}

	for (const [domainKey, permission] of Object.entries(permissions)) {
		if (normalizeAccessKey(domainKey) === normalizedDomain) {
			return permission;
		}
	}
	return undefined;
}

function getTrafficCompanyTypePermissions(
	service: AccessServiceType,
	domain: string,
	action: DomainPermissionAction,
): TrafficCompanyType[] | null {
	const permissions = service.traffic_company_type_permissions;
	if (!permissions) {
		return null;
	}

	const normalizedDomain = normalizeAccessKey(domain);
	for (const [domainKey, actionMap] of Object.entries(permissions)) {
		if (normalizeAccessKey(domainKey) !== normalizedDomain) {
			continue;
		}

		const values = actionMap?.[action];
		if (!Array.isArray(values)) {
			return null;
		}

		return values
			.map(item => normalizeTrafficCompanyType(item))
			.filter((item): item is TrafficCompanyType => Boolean(item));
	}

	return null;
}

function hasTrafficCompanyTypePermission(
	service: AccessServiceType,
	domain: string,
	action: DomainPermissionAction,
	trafficCompanyType?: string | null,
): boolean {
	if (normalizeAccessKey(service.code) !== TRAFFIC_SERVICE_CODE) {
		return true;
	}

	const permittedTypes = getTrafficCompanyTypePermissions(service, domain, action);
	if (!permittedTypes) {
		return true;
	}

	if (!trafficCompanyType) {
		return permittedTypes.length > 0;
	}

	const normalizedType = normalizeTrafficCompanyType(trafficCompanyType);
	return Boolean(normalizedType && permittedTypes.includes(normalizedType));
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

		return hasTrafficCompanyTypePermission(service, normalizedDomain, action, options.trafficCompanyType);
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

export function getPermittedTrafficCompanyTypesForDomain(
	services: UserInfoType["services"],
	domain: string | undefined,
	action: DomainPermissionAction = "view",
	serviceId?: number | null,
): TrafficCompanyType[] {
	const trafficServices = (services ?? []).filter(service =>
		normalizeAccessKey(service.code) === TRAFFIC_SERVICE_CODE
		&& (serviceId == null || service.id === serviceId)
		&& Boolean(getDomainPermission(service.permissions, domain ?? "")?.[action]),
	);

	if (!trafficServices.length) {
		return [];
	}

	const permittedTypes = new Set<TrafficCompanyType>();
	for (const service of trafficServices) {
		const configuredTypes = getTrafficCompanyTypePermissions(service, domain ?? "", action);
		const types = configuredTypes ?? ALL_TRAFFIC_COMPANY_TYPES;
		types.forEach(type => permittedTypes.add(type));
	}

	return ALL_TRAFFIC_COMPANY_TYPES.filter(type => permittedTypes.has(type));
}

export function hasAdminAccess(user: Pick<
	UserInfoType,
	| "admin_role"
	| "is_superuser"
	| "is_staff"
	| "can_manage_users"
	| "can_manage_roles"
	| "deputy_permissions"
>, target: AdminAccessTarget): boolean {
	const isSuperAdmin = user.is_superuser || normalizeAccessKey(user.admin_role) === "superuser";
	if (isSuperAdmin) {
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
