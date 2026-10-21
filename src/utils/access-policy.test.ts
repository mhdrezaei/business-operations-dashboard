import type { AccessServiceType } from "#src/api/user/types";
import {
	getPermittedCompanyTypesForDomain,
	getPermittedServiceIdsForDomain,
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
