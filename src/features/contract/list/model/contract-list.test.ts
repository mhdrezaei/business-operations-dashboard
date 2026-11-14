import type { ContractListItemType } from "./contracts.list.types";
import { describe, expect, it } from "vitest";
import {
	CONTRACT_LIST_DEFAULT_PAGE_SIZE,
	CONTRACT_LIST_PAGE_SIZE_OPTIONS,
	CONTRACT_LIST_SORT_ALIASES,
	formatContractMonth,
	getContractDeleteWarnings,
	getContractListUserName,
	getContractPdfBlockReason,
	getOfficeApproval,
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

	it("parses numeric company_id, string company_type, and boolean real_signed correctly", () => {
		const query = toContractListQuery({
			company_id: "42",
			company_type: "IXP",
			real_signed: false,
			is_official: true,
			sms_party: "vendor",
		});
		expect(query).toMatchObject({
			company_id: 42,
			company_type: "IXP",
			real_signed: false,
			is_official: true,
			sms_party: "vendor",
		});
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

describe("contract-list constants", () => {
	it("exports expected sort aliases and paging defaults", () => {
		expect(CONTRACT_LIST_SORT_ALIASES).toEqual({ end_date: "end_date_exclusive" });
		expect(CONTRACT_LIST_DEFAULT_PAGE_SIZE).toBe(20);
		expect(CONTRACT_LIST_PAGE_SIZE_OPTIONS).toEqual([20, 50, 100, 200]);
	});
});

describe("getOfficeApproval", () => {
	it("returns 'approved' when is_signed is explicitly true, regardless of business approval", () => {
		expect(getOfficeApproval({ is_signed: true, is_business_approved: true })).toBe("approved");
		expect(getOfficeApproval({ is_signed: true, is_business_approved: false })).toBe("approved");
		expect(getOfficeApproval({ is_signed: true, is_business_approved: null })).toBe("approved");
		expect(getOfficeApproval({ is_signed: true, is_business_approved: undefined })).toBe("approved");
	});

	it("returns 'waiting' when is_signed is not true but business is approved", () => {
		expect(getOfficeApproval({ is_signed: false, is_business_approved: true })).toBe("waiting");
		expect(getOfficeApproval({ is_signed: null, is_business_approved: true })).toBe("waiting");
		expect(getOfficeApproval({ is_signed: undefined, is_business_approved: true })).toBe("waiting");
	});

	it("returns 'waiting_business' when neither signature nor business approval is true", () => {
		expect(getOfficeApproval({ is_signed: false, is_business_approved: false })).toBe("waiting_business");
		expect(getOfficeApproval({ is_signed: null, is_business_approved: null })).toBe("waiting_business");
		expect(getOfficeApproval({ is_signed: undefined, is_business_approved: undefined })).toBe("waiting_business");
		expect(getOfficeApproval({ is_signed: false, is_business_approved: null })).toBe("waiting_business");
		expect(getOfficeApproval({ is_signed: null, is_business_approved: false })).toBe("waiting_business");
		expect(getOfficeApproval({ is_signed: null, is_business_approved: undefined })).toBe("waiting_business");
	});
});

describe("getContractDeleteWarnings", () => {
	it("returns empty array when contract has no approvals and zero addenda", () => {
		expect(getContractDeleteWarnings({})).toEqual([]);
		expect(getContractDeleteWarnings({ is_business_approved: false, is_signed: false, addenda_count: 0 })).toEqual([]);
		expect(getContractDeleteWarnings({ is_business_approved: null, is_signed: null, addenda_count: null })).toEqual([]);
		expect(getContractDeleteWarnings({ is_business_approved: undefined, is_signed: undefined, addenda_count: undefined })).toEqual([]);
	});

	it("does not report addenda warning for zero, negative or NaN count", () => {
		expect(getContractDeleteWarnings({ addenda_count: 0 })).toEqual([]);
		expect(getContractDeleteWarnings({ addenda_count: -1 })).toEqual([]);
		expect(getContractDeleteWarnings({ addenda_count: Number.NaN })).toEqual([]);
	});

	it("includes 'approved' without duplicate when business approval or signature (or both) is true", () => {
		expect(getContractDeleteWarnings({ is_business_approved: true })).toEqual(["approved"]);
		expect(getContractDeleteWarnings({ is_signed: true })).toEqual(["approved"]);
		expect(getContractDeleteWarnings({ is_business_approved: true, is_signed: true })).toEqual(["approved"]);
		expect(getContractDeleteWarnings({ is_business_approved: true, is_signed: false })).toEqual(["approved"]);
		expect(getContractDeleteWarnings({ is_business_approved: false, is_signed: true })).toEqual(["approved"]);
	});

	it("includes 'addenda' when addenda_count is greater than 0", () => {
		expect(getContractDeleteWarnings({ addenda_count: 1 })).toEqual(["addenda"]);
		expect(getContractDeleteWarnings({ addenda_count: 5 })).toEqual(["addenda"]);
		expect(getContractDeleteWarnings({ addenda_count: "3" as unknown as number })).toEqual(["addenda"]);
	});

	it("includes both 'approved' and 'addenda' in expected order when both conditions are met", () => {
		expect(getContractDeleteWarnings({ is_business_approved: true, addenda_count: 3 })).toEqual(["approved", "addenda"]);
		expect(getContractDeleteWarnings({ is_signed: true, addenda_count: 1 })).toEqual(["approved", "addenda"]);
		expect(getContractDeleteWarnings({ is_business_approved: true, is_signed: true, addenda_count: 2 })).toEqual(["approved", "addenda"]);
	});
});
