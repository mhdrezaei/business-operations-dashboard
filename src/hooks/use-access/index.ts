import type { DomainCrudPermission, DomainPermissionAction } from "#src/api/user/types";
import { useUserStore } from "#src/store";
import { isString } from "#src/utils";

import { useMatches } from "react-router";
import { accessControlCodes, AccessControlRoles } from "./constants";

export * from "./constants";

function normalizeAccessKey(value?: string | null) {
	return (value ?? "").trim().toLowerCase();
}

function getDomainPermission(
	permissions: Record<string, DomainCrudPermission> | undefined,
	domain: string,
) {
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

/**
 * @fa تشخیص مجوز
 * @en Access judgment
 */
export function useAccess() {
	const matches = useMatches();
	const {
		roles: userRoles,
		services: userServices = [],
		company_visible_cards: companyVisibleCards = [],
		portal_viewer: portalViewer,
	} = useUserStore();
	const currentRoute = matches[matches.length - 1];

	/**
	 * @fa بررسی دسترسی مسیر فعلی بر اساس کد مجوز
	 * @en Determine whether the current route has a specified permission based on permission codes
	 */
	const hasAccessByCodes = (permission?: string | Array<string>) => {
		if (!permission)
			return false;
		const metaAuth = currentRoute?.handle?.permissions;
		if (!metaAuth) {
			return false;
		}
		permission = isString(permission) ? [permission] : permission;
		permission = permission.map(item => item.toLowerCase());
		if (import.meta.env.DEV) {
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
	 * @fa تشخیص دسترسی کاربر بر اساس نقش
	 * @en Determine whether the current user has a specified permission based on roles
	 */
	const hasAccessByRoles = (roles?: string | Array<string>) => {
		if (!roles || !userRoles) {
			return false;
		}
		roles = isString(roles) ? [roles] : roles;
		roles = roles.map(item => item.toLowerCase());
		if (import.meta.env.DEV) {
			for (const roleItem of roles) {
				if (!Object.values(AccessControlRoles).includes(roleItem)) {
					console.warn(`[hasAccessByRoles]: '${roleItem}' is not a valid role`);
				}
			}
		}
		const isAuth = userRoles.some(item => roles.includes(item.toLowerCase()));
		return isAuth;
	};

	const hasDomainPermission = (
		domain?: string,
		action: DomainPermissionAction = "view",
		serviceCode?: string,
	) => {
		const normalizedDomain = normalizeAccessKey(domain);
		if (!normalizedDomain) {
			return false;
		}
		const normalizedServiceCode = normalizeAccessKey(serviceCode);
		return userServices.some((service) => {
			if (normalizedServiceCode && normalizeAccessKey(service.code) !== normalizedServiceCode) {
				return false;
			}
			const permission = getDomainPermission(service.permissions, normalizedDomain);
			return Boolean(permission?.[action]);
		});
	};

	const hasDomainPermissionByServiceId = (
		domain?: string,
		action: DomainPermissionAction = "view",
		serviceId?: number | null,
	) => {
		const normalizedDomain = normalizeAccessKey(domain);
		if (!normalizedDomain) {
			return false;
		}
		if (serviceId == null) {
			return hasDomainPermission(normalizedDomain, action);
		}
		return userServices.some((service) => {
			if (service.id !== serviceId) {
				return false;
			}
			const permission = getDomainPermission(service.permissions, normalizedDomain);
			return Boolean(permission?.[action]);
		});
	};

	const getPermittedServiceIds = (
		domain?: string,
		action: DomainPermissionAction = "view",
	) => {
		const normalizedDomain = normalizeAccessKey(domain);
		if (!normalizedDomain) {
			return [];
		}
		return userServices
			.filter((service) => {
				const permission = getDomainPermission(service.permissions, normalizedDomain);
				return Boolean(permission?.[action]);
			})
			.map(service => service.id);
	};

	const getPermittedServiceCodes = (
		domain?: string,
		action: DomainPermissionAction = "view",
	) => {
		const normalizedDomain = normalizeAccessKey(domain);
		if (!normalizedDomain) {
			return [];
		}
		const codes = userServices
			.filter((service) => {
				const permission = getDomainPermission(service.permissions, normalizedDomain);
				return Boolean(permission?.[action]);
			})
			.map(service => normalizeAccessKey(service.code))
			.filter(Boolean);
		return Array.from(new Set(codes));
	};

	const hasCompanyCardAccess = (cardCode?: string) => {
		const normalizedCardCode = normalizeAccessKey(cardCode);
		if (!normalizedCardCode) {
			return false;
		}
		const normalizedCards = companyVisibleCards.map(item => normalizeAccessKey(item));
		if (normalizedCards.includes("all")) {
			return true;
		}
		return normalizedCards.includes(normalizedCardCode);
	};

	const isPortalViewer = Boolean(portalViewer?.assigned);

	return {
		hasAccessByCodes,
		hasAccessByRoles,
		hasDomainPermission,
		hasDomainPermissionByServiceId,
		getPermittedServiceIds,
		getPermittedServiceCodes,
		hasCompanyCardAccess,
		isPortalViewer,
	};
}
