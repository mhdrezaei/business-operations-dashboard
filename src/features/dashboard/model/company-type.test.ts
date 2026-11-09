import { describe, expect, it } from "vitest";
import { rowCompanyType } from "./company-type";

describe("rowCompanyType", () => {
	it("prefers the contract's own type over the company type", () => {
		expect(rowCompanyType({ company_type: "CP", contract_company_type: "COLLOCATION" })).toBe("COLLOCATION");
	});

	it("falls back to the company type when the contract type is null or missing", () => {
		expect(rowCompanyType({ company_type: "CP", contract_company_type: null })).toBe("CP");
		expect(rowCompanyType({ company_type: "CP" })).toBe("CP");
	});
});
