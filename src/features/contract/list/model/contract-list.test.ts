import type { ContractListItemType } from "./contracts.list.types";
import { describe, expect, it } from "vitest";
import {
	formatContractMonth,
	getContractListUserName,
	getContractPdfBlockReason,
	resolveListServicePath,
	resolveSmsParty,
	toContractListQuery,
} from "./contract-list";

const row = (patch: Partial<ContractListItemType>) => ({ id: 1, company_name: "ACME", ...patch }) as ContractListItemType;

describe("toContractListQuery", () => {
	it("maps approval, signature and official filters from form strings", () => {
		const query = toContractListQuery({
			current: 2,
			pageSize: 50,
			service_id: "3",
			is_business_approved: "pending",
			office_approval: "waiting",
			real_signed: "true",
			is_official: "false",
		}, "-start_date");
		expect(query).toMatchObject({
			page: 2,
			page_size: 50,
			service_id: 3,
			is_business_approved: "pending",
			office_approval: "waiting",
			real_signed: true,
			is_official: false,
			ordering: "-start_date",
		});
	});

	it("drops empty and unknown values and defaults paging", () => {
		const query = toContractListQuery({ is_business_approved: "weird", is_official: "", sms_party: "x", search: "" });
		expect(query).toMatchObject({ page: 1, page_size: 20 });
		expect(query.is_business_approved).toBeUndefined();
		expect(query.is_official).toBeUndefined();
		expect(query.sms_party).toBeUndefined();
		expect(query.search).toBeUndefined();
	});
});

describe("resolveListServicePath", () => {
	it("derives the SMS party from the SMS_VENDOR company when the API omits it", () => {
		expect(resolveSmsParty(row({ company_name: "SMS_VENDOR" }))).toBe("vendor");
		expect(resolveListServicePath(row({ company_name: "SMS_VENDOR" }), "sms")).toBe("sms/vendor");
		expect(resolveListServicePath(row({ company_name: "Partner" }), "sms")).toBe("sms/client");
	});

	it("resolves telecom frame and sales agency rows", () => {
		expect(resolveListServicePath(row({}), "telecom_frame")).toBe("telecom-frame");
		expect(resolveListServicePath(row({ company_type: "SALES_REP_MANAGEMENT" }), "sales_agency")).toBe("sales-agency/rep-management");
		expect(resolveListServicePath(row({ company_type: "OUTBOUND" }), "sales_agency")).toBe("sales-agency/outbound");
	});

	it("falls back to openapi for unknown services", () => {
		expect(resolveListServicePath(row({}), "something_else")).toBe("openapi");
	});
});

describe("row helpers", () => {
	it("blocks PDF for PSP and unofficial traffic only", () => {
		expect(getContractPdfBlockReason("psp", true)).toBe("psp");
		expect(getContractPdfBlockReason("traffic", false)).toBe("unofficialTraffic");
		expect(getContractPdfBlockReason("traffic", true)).toBeNull();
		expect(getContractPdfBlockReason("openapi", false)).toBeNull();
	});

	it("formats months and user names", () => {
		expect(formatContractMonth(1404, 5)).toBe("1404/5");
		expect(formatContractMonth(null, 5)).toBeNull();
		expect(getContractListUserName({ first_name: "Ali", last_name: " Reza " })).toBe("Ali Reza");
		expect(getContractListUserName(null)).toBeNull();
	});
});
