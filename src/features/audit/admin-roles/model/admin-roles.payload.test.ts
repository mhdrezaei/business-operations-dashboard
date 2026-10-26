import type { AdminRolePermissionFlags } from "./admin-roles.payload";
import type { AdminRolePolicyDto } from "./admin-roles.types";
import { buildAdminRolePoliciesPayload } from "./admin-roles.payload";

function flags(view: boolean, create = false, update = false, remove = false, sign = false, businessApprove = false): AdminRolePermissionFlags {
	return {
		view,
		create,
		update,
		delete: remove,
		sign,
		business_approve: businessApprove,
	};
}

function policy(overrides: Partial<AdminRolePolicyDto>): AdminRolePolicyDto {
	return {
		id: 1,
		role: 1,
		service: 1,
		service_code: "sms",
		service_name: "پیامک",
		domain: "contracts",
		can_view: true,
		can_create: false,
		can_update: false,
		can_delete: false,
		can_sign: false,
		can_business_approve: false,
		company_visible_cards: [],
		company_types: [],
		actor_company_type_permissions: null,
		updated_at: "",
		...overrides,
	};
}

const servicesByDomain = {
	contracts: [{ id: 1, code: "sms" }, { id: 2, code: "others" }],
	performances: [],
	predictions: [],
	company_profile: [],
};

const emptyMatrix = { performances: {}, predictions: {}, company_profile: {} };

describe("buildAdminRolePoliciesPayload", () => {
	it("sends the picked company types only for company-type scoped services", () => {
		const { items } = buildAdminRolePoliciesPayload({
			servicesByDomain,
			permissionMatrix: { ...emptyMatrix, contracts: { 1: flags(true, true), 2: flags(true) } },
			selectedCompanyCards: [],
			initialPolicies: [],
			getSelectedCompanyTypes: () => ["CP", "TELECOM"],
		});

		expect(items).toEqual([
			expect.objectContaining({ service: 1, company_types: ["CP", "TELECOM"], can_sign: false, can_business_approve: false }),
			expect.not.objectContaining({ company_types: expect.anything() }),
		]);
	});

	it("sends sign and business approval for contracts only", () => {
		const { items } = buildAdminRolePoliciesPayload({
			servicesByDomain: { ...servicesByDomain, performances: [{ id: 3, code: "others" }] },
			permissionMatrix: { ...emptyMatrix, contracts: { 2: flags(true, false, false, false, true, true) }, performances: { 3: flags(true, false, false, false, true, true) } },
			selectedCompanyCards: [],
			initialPolicies: [],
			getSelectedCompanyTypes: () => [],
		});

		expect(items[0]).toMatchObject({ domain: "contracts", can_sign: true, can_business_approve: true });
		expect(items[1]).toMatchObject({ domain: "performances", can_sign: false, can_business_approve: false });
	});

	it("keeps a row that only carries an approval and the contract_template policies", () => {
		const { items } = buildAdminRolePoliciesPayload({
			servicesByDomain,
			permissionMatrix: { ...emptyMatrix, contracts: { 2: flags(false, false, false, false, true) } },
			selectedCompanyCards: [],
			initialPolicies: [policy({ id: 2, service: 2, service_code: "others", domain: "contract_template", can_update: true })],
			getSelectedCompanyTypes: () => [],
		});

		expect(items).toEqual([
			expect.objectContaining({ domain: "contracts", service: 2, can_view: false, can_sign: true }),
			expect.objectContaining({ domain: "contract_template", service: 2, can_view: true, can_update: true }),
		]);
	});
});
