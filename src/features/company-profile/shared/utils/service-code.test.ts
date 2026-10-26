import { describe, expect, it } from "vitest";
import { companyTypeKey, isSmsCommissionServiceCode, serviceRequiresCompanyType, serviceRequiresCompanyTypeOnCreate } from "./index";

describe("company service codes", () => {
	it("create requires company_type also for telecom_frame and sales_agency", () => {
		expect(serviceRequiresCompanyTypeOnCreate("telecom_frame")).toBe(true);
		expect(serviceRequiresCompanyTypeOnCreate("Sales_Agency")).toBe(true);
		expect(serviceRequiresCompanyTypeOnCreate("openapi")).toBe(false);
		expect(serviceRequiresCompanyType("telecom_frame")).toBe(false);
	});

	it("detects sms_commission code variants", () => {
		expect(isSmsCommissionServiceCode("sms-commission")).toBe(true);
		expect(isSmsCommissionServiceCode("sms")).toBe(false);
	});

	it("resolves the company type key from string or object", () => {
		expect(companyTypeKey("TELECOM")).toBe("TELECOM");
		expect(companyTypeKey({ OUTBOUND: "Outbound" })).toBe("OUTBOUND");
		expect(companyTypeKey(null)).toBeNull();
	});
});
