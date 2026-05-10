import type { CompanyTypeOption, DomainPermissionAction } from "#src/api/user/types";
import { useUserStore } from "#src/store";
import { isString } from "#src/utils";
import {
	getPermittedCompanyTypesForDomain,
	getPermittedServiceCodesForDomain,
	getPermittedServiceIdsForDomain,
	getPermittedTrafficCompanyTypesForDomain,
	hasAdminAccess,
	hasDomainPermissionForServices,
	normalizeAccessKey,
} from "#src/utils/access-policy";

import { useMatches } from "react-router";
import { accessControlCodes, AccessControlRoles } from "./constants";

export * from "./constants";

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
		...userAccessState
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
		trafficCompanyType?: string | null,
	) => {
		return hasDomainPermissionForServices(userServices, domain, action, {
			serviceCode,
			trafficCompanyType,
		});
	};

	const hasDomainPermissionByServiceId = (
		domain?: string,
		action: DomainPermissionAction = "view",
		serviceId?: number | null,
		trafficCompanyType?: string | null,
	) => {
		if (serviceId == null) {
			return hasDomainPermission(domain, action, undefined, trafficCompanyType);
		}
		return hasDomainPermissionForServices(userServices, domain, action, {
			serviceId,
			trafficCompanyType,
		});
	};

	const getPermittedServiceIds = (
		domain?: string,
		action: DomainPermissionAction = "view",
	) => {
		return getPermittedServiceIdsForDomain(userServices, domain, action);
	};

	const getPermittedServiceCodes = (
		domain?: string,
		action: DomainPermissionAction = "view",
	) => {
		return getPermittedServiceCodesForDomain(userServices, domain, action);
	};

	const getPermittedTrafficCompanyTypes = (
		domain?: string,
		action: DomainPermissionAction = "view",
		serviceId?: number | null,
	) => {
		return getPermittedTrafficCompanyTypesForDomain(userServices, domain, action, serviceId);
	};

	const getPermittedCompanyTypes = (
		domain?: string,
		action: DomainPermissionAction = "view",
		serviceId?: number | null,
	): CompanyTypeOption[] => {
		return getPermittedCompanyTypesForDomain(userServices, domain, action, serviceId);
	};

	const hasAdminPanelAccess = (target: Parameters<typeof hasAdminAccess>[1]) => {
		return hasAdminAccess(userAccessState, target);
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
		getPermittedCompanyTypes,
		getPermittedTrafficCompanyTypes,
		hasCompanyCardAccess,
		hasAdminPanelAccess,
		isPortalViewer,
	};
}
