import type { AdminRolePermissionFlags } from "./admin-roles.payload";
import { buildAdminRolePoliciesPayload, setGrantableFlags, withoutCompanyTypeSelections } from "./admin-roles.payload";

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

const servicesByDomain = {
	contracts: [{ id: 1, code: "sms" }, { id: 2, code: "others" }],
	performances: [],
	predictions: [],
	company_profile: [],
	contract_template: [],
};

const emptyMatrix = { performances: {}, predictions: {}, company_profile: {}, contract_template: {} };

describe("buildAdminRolePoliciesPayload", () => {
	it("sends the picked company types only for company-type scoped services", () => {
		const { items } = buildAdminRolePoliciesPayload({
			servicesByDomain,
			permissionMatrix: { ...emptyMatrix, contracts: { 1: flags(true, true), 2: flags(true) } },
			selectedCompanyCards: [],
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
			getSelectedCompanyTypes: () => [],
		});

		expect(items[0]).toMatchObject({ domain: "contracts", can_sign: true, can_business_approve: true });
		expect(items[1]).toMatchObject({ domain: "performances", can_sign: false, can_business_approve: false });
	});

	it("keeps a row that only carries an approval and sends contract_template like any other domain", () => {
		const { items } = buildAdminRolePoliciesPayload({
			servicesByDomain: { ...servicesByDomain, contract_template: [{ id: 2, code: "others" }] },
			permissionMatrix: { ...emptyMatrix, contracts: { 2: flags(false, false, false, false, true) }, contract_template: { 2: flags(true, false, true, false) } },
			selectedCompanyCards: [],
			getSelectedCompanyTypes: () => [],
		});

		expect(items).toEqual([
			expect.objectContaining({ domain: "contracts", service: 2, can_view: false, can_sign: true }),
			expect.objectContaining({ domain: "contract_template", service: 2, can_view: true, can_update: true }),
		]);
	});
});

describe("withoutCompanyTypeSelections", () => {
	it("drops only the picks of the given services in that domain", () => {
		const selections = {
			"predictions:1": ["a", "b"],
			"predictions:2": ["c"],
			"performances:1": ["d"],
		};

		expect(withoutCompanyTypeSelections(selections, "predictions", [1])).toEqual({
			"predictions:2": ["c"],
			"performances:1": ["d"],
		});
	});
});

describe("setGrantableFlags", () => {
	it("only touches the actions the admin may grant", () => {
		const current = flags(false, false, false, true);
		const canGrant = (action: string) => action === "view" || action === "update";

		expect(setGrantableFlags(current, true, "predictions", canGrant)).toEqual(flags(true, false, true, true));
		expect(setGrantableFlags(flags(true, true, true, true), false, "predictions", canGrant)).toEqual(flags(false, true, false, true));
	});

	it("covers the contract approvals only for the contracts domain", () => {
		const everything = () => true;

		expect(setGrantableFlags(flags(false), true, "contracts", everything)).toEqual(flags(true, true, true, true, true, true));
		expect(setGrantableFlags(flags(false), true, "performances", everything)).toEqual(flags(true, true, true, true));
	});
});
