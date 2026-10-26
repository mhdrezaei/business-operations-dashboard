import type { AccessServiceType } from "#src/api/user/types";
import {
	getPermittedCompanyTypesForDomain,
	getPermittedServiceIdsForDomain,
	hasAdminAccess,
	hasAdminCapability,
	hasAdminSectionAction,
	hasAnyDomainPermissionForServices,
	hasDomainPermissionForServices,
	isFullAdmin,
	normalizeDeputyPermissions,
} from "./access-policy";

const serviceWithStringId = {
	id: "12",
	code: "sms",
	name: "پیامک",
	permissions: {
		company_profile: {
			view: true,
			create: true,
			update: true,
			delete: true,
		},
	},
	company_type_permissions: {
		company_profile: {
			create: [{ AGGREGATOR: "تجمیع‌کننده" }],
			update: [{ AGGREGATOR: "تجمیع‌کننده" }],
		},
	},
} as unknown as AccessServiceType;

describe("access policy service ids", () => {
	it("matches a string service id from the API with a numeric selected id", () => {
		expect(hasDomainPermissionForServices(
			[serviceWithStringId],
			"company_profile",
			"update",
			{ serviceId: 12, trafficCompanyType: "AGGREGATOR" },
		)).toBe(true);
	});

	it("returns normalized numeric service ids", () => {
		expect(getPermittedServiceIdsForDomain(
			[serviceWithStringId],
			"company_profile",
			"view",
		)).toEqual([12]);
	});

	it("uses the same normalized id when resolving company types", () => {
		expect(getPermittedCompanyTypesForDomain(
			[serviceWithStringId],
			"company_profile",
			"update",
			12,
		)).toEqual([{ key: "AGGREGATOR", value: "تجمیع‌کننده" }]);
	});

	it("denies access when company types array is empty (explicitly forbidden)", () => {
		const restrictedService = {
			...serviceWithStringId,
			company_type_permissions: {
				company_profile: {
					delete: [],
				},
			},
		} as unknown as AccessServiceType;

		expect(hasDomainPermissionForServices(
			[restrictedService],
			"company_profile",
			"delete",
			{ serviceId: 12, trafficCompanyType: "AGGREGATOR" },
		)).toBe(false);

		expect(hasDomainPermissionForServices(
			[restrictedService],
			"company_profile",
			"delete",
		)).toBe(false);
	});
});

describe("admin panel granular permissions", () => {
	const userWithSpecificActions = {
		role: "user",
		admin_sections: [
			"users",
			"roles",
			"service_admins",
			"logs",
			"notification_rules",
		],
		admin_section_actions: {
			users: ["view", "create", "update", "delete"],
			roles: ["view", "create", "update", "delete"],
			service_admins: ["view"],
			logs: ["view"],
			notification_rules: ["view"],
		},
	} as any;

	it("allows users full CRUD on users and roles", () => {
		expect(hasAdminAccess(userWithSpecificActions, "users")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "users", "view")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "users", "create")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "users", "update")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "users", "delete")).toBe(true);

		expect(hasAdminAccess(userWithSpecificActions, "roles")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "roles", "create")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "roles", "update")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "roles", "delete")).toBe(true);
	});

	it("allows only view on service_admins", () => {
		expect(hasAdminAccess(userWithSpecificActions, "service_admins")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "service_admins", "view")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "service_admins", "update")).toBe(false);
	});

	it("keeps audit logs and notification/sign-flow rules for full admins only", () => {
		for (const target of ["audit_logs", "logs", "notification_rules", "policies"] as const) {
			expect(hasAdminAccess(userWithSpecificActions, target)).toBe(false);
			expect(hasAdminSectionAction(userWithSpecificActions, target, "view")).toBe(false);
		}
		expect(hasAdminAccess({ role: "staff_admin" } as any, "audit_logs")).toBe(true);
		expect(hasAdminAccess({ is_superuser: true } as any, "policies")).toBe(true);
	});

	it("grants non-CRUD user-management capabilities to service admins and granted deputies only", () => {
		expect(hasAdminCapability({ role: "superuser" } as any, "manage_deputies")).toBe(true);
		expect(hasAdminCapability({ role: "service_admin" } as any, "assign_roles")).toBe(true);
		const deputy = { role: "deputy_service_admin", deputy_permissions: normalizeDeputyPermissions(["assign_roles"]) } as any;
		expect(hasAdminCapability(deputy, "assign_roles")).toBe(true);
		expect(hasAdminCapability(deputy, "manage_deputies")).toBe(false);
	});

	it("gives superuser and staff full access to all admin actions", () => {
		const superuser = { role: "superuser" } as any;
		expect(hasAdminSectionAction(superuser, "notification_rules", "create")).toBe(true);
		expect(hasAdminSectionAction(superuser, "service_admins", "update")).toBe(true);

		const staff = { is_staff: true } as any;
		expect(hasAdminSectionAction(staff, "notification_rules", "delete")).toBe(true);
		expect(hasAdminSectionAction(staff, "roles", "delete")).toBe(true);
	});
});

describe("deputy permissions and full admin", () => {
	it("turns the backend string list into boolean flags", () => {
		expect(normalizeDeputyPermissions(["create_users", "manage_policies"])).toEqual({
			can_create_users: true,
			can_create_roles: false,
			can_edit_users: false,
			can_assign_roles: false,
			can_manage_policies: true,
		});
		expect(normalizeDeputyPermissions(undefined).can_create_users).toBe(false);
		expect(normalizeDeputyPermissions({ can_edit_users: true } as any).can_edit_users).toBe(true);
	});

	it("treats superuser, staff_admin and django staff as full admins", () => {
		expect(isFullAdmin({ role: "superuser" } as any)).toBe(true);
		expect(isFullAdmin({ admin_role: "staff_admin" } as any)).toBe(true);
		expect(isFullAdmin({ is_staff: true } as any)).toBe(true);
		expect(isFullAdmin({ role: "service_admin" } as any)).toBe(false);
	});
});

describe("any-of route actions", () => {
	const salesAgency = {
		id: 7,
		code: "sales_agency",
		name: "عاملیت فروش",
		permissions: { contracts: ["update"] },
	} as unknown as AccessServiceType;

	it("opens the route when one of the actions is granted on the service", () => {
		expect(hasAnyDomainPermissionForServices([salesAgency], "contracts", ["view", "create", "update"], { serviceCode: "sales_agency" })).toBe(true);
		expect(hasAnyDomainPermissionForServices([salesAgency], "contracts", ["view", "create"], { serviceCode: "sales_agency" })).toBe(false);
		expect(hasAnyDomainPermissionForServices([salesAgency], "contracts", "update", { serviceCode: "sms" })).toBe(false);
	});
});
