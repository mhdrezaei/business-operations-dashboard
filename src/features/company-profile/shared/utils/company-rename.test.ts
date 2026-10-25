import { buildCompanyRenamePayload } from "./company-rename";

describe("buildCompanyRenamePayload", () => {
	it("always carries company_type (telecom_frame / sales_agency PUT validates it)", () => {
		expect(buildCompanyRenamePayload(" X ", 5, "OUTBOUND")).toEqual({ name: "X", service: 5, company_type: "OUTBOUND" });
	});
});
