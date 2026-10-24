import type { AccessServiceType } from "#src/api/user/types";
import {
	getPermittedCompanyTypesForDomain,
	getPermittedServiceIdsForDomain,
	hasAdminAccess,
	hasAdminSectionAction,
	hasDomainPermissionForServices,
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

	it("allows only view on service_admins, logs, and notification_rules", () => {
		expect(hasAdminAccess(userWithSpecificActions, "service_admins")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "service_admins", "view")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "service_admins", "update")).toBe(false);

		expect(hasAdminAccess(userWithSpecificActions, "audit_logs")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "audit_logs", "view")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "audit_logs", "delete")).toBe(false);

		expect(hasAdminAccess(userWithSpecificActions, "notification_rules")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "notification_rules", "view")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "notification_rules", "create")).toBe(false);
		expect(hasAdminSectionAction(userWithSpecificActions, "notification_rules", "update")).toBe(false);
		expect(hasAdminSectionAction(userWithSpecificActions, "notification_rules", "delete")).toBe(false);

		// policies alias maps to notification_rules
		expect(hasAdminAccess(userWithSpecificActions, "policies")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "policies", "view")).toBe(true);
		expect(hasAdminSectionAction(userWithSpecificActions, "policies", "create")).toBe(false);
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
