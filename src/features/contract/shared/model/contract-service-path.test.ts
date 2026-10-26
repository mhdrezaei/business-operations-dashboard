import { describe, expect, it } from "vitest";
import { isCollocationCostContext, resolveContractServicePath } from "./contract-service-path";

describe("resolveContractServicePath", () => {
	it("resolves plain services, sms party, sales agency type and telecom frame", () => {
		expect(resolveContractServicePath({ serviceCode: "Traffic" })).toBe("traffic");
		expect(resolveContractServicePath({ serviceCode: "sms", counterpartyType: "partners" })).toBe("sms/client");
		expect(resolveContractServicePath({ serviceCode: "sms", counterpartyType: "gov_ops" })).toBe("sms/vendor");
		expect(resolveContractServicePath({ serviceCode: "sms" })).toBeNull();
		expect(resolveContractServicePath({ serviceCode: "sms_commission" })).toBe("sms-commission");
		expect(resolveContractServicePath({ serviceCode: "sales_agency", companyType: "OUTBOUND" })).toBe("sales-agency/outbound");
		expect(resolveContractServicePath({ serviceCode: "sales-agency", companyType: "SALES_REP_MANAGEMENT" })).toBe("sales-agency/rep-management");
		expect(resolveContractServicePath({ serviceCode: "sales_agency" })).toBeNull();
		expect(resolveContractServicePath({ serviceCode: "telecom_frame" })).toBe("telecom-frame");
		expect(resolveContractServicePath({ serviceCode: "unknown" })).toBeNull();
	});

	it("detects the collocation cost context", () => {
		expect(isCollocationCostContext({ serviceCode: "traffic", companyType: "collocation", counterpartyType: "gov_ops" })).toBe(true);
		expect(isCollocationCostContext({ serviceCode: "traffic", companyType: "COLLOCATION", counterpartyType: "partners" })).toBe(false);
		expect(isCollocationCostContext({ serviceCode: "sms", companyType: "COLLOCATION", counterpartyType: "gov_ops" })).toBe(false);
	});
});
