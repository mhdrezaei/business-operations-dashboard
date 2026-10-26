import { getContractAccessCompanyType } from "./company-type-options";

describe("getContractAccessCompanyType", () => {
	it("scopes SMS vendor contracts by the VENDOR token and leaves other contracts as they are", () => {
		expect(getContractAccessCompanyType("sms/vendor", null)).toBe("VENDOR");
		expect(getContractAccessCompanyType("sms/client", "CP")).toBe("CP");
		expect(getContractAccessCompanyType("traffic", "IXP")).toBe("IXP");
		expect(getContractAccessCompanyType(null, undefined)).toBeUndefined();
	});
});
