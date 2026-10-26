import { describe, expect, it } from "vitest";
import { resolveContractGapsScope } from "./contract-gaps";

describe("resolveContractGapsScope", () => {
	it("fetches without company for SMS vendor", () => {
		expect(resolveContractGapsScope({ serviceCode: "sms", counterpartyType: "gov_ops", companyId: null, companyType: null }))
			.toEqual({ companyId: null, companyType: "VENDOR", allowWithoutCompany: true });
	});

	it("fetches without company for telecom collocation cost", () => {
		expect(resolveContractGapsScope({ serviceCode: "traffic", counterpartyType: "gov_ops", companyId: null, companyType: "collocation" }))
			.toEqual({ companyId: null, companyType: "collocation", allowWithoutCompany: true });
	});

	it("requires a company otherwise and only sends company_type for traffic", () => {
		expect(resolveContractGapsScope({ serviceCode: "sms", counterpartyType: "partners", companyId: 3, companyType: "CLIENT" }))
			.toEqual({ companyId: 3, companyType: null, allowWithoutCompany: false });
		expect(resolveContractGapsScope({ serviceCode: "traffic", counterpartyType: "partners", companyId: 3, companyType: "CP" }))
			.toEqual({ companyId: 3, companyType: "CP", allowWithoutCompany: false });
		expect(resolveContractGapsScope({ serviceCode: "shahkar", counterpartyType: null, companyId: 5, companyType: null }))
			.toEqual({ companyId: 5, companyType: null, allowWithoutCompany: false });
	});
});
