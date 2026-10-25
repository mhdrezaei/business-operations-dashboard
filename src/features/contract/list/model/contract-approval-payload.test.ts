import { describe, expect, it } from "vitest";
import { buildContractApprovalPayload } from "./contract-approval-payload";

describe("buildContractApprovalPayload", () => {
	it("targets the main contract with a trimmed comment", () => {
		expect(buildContractApprovalPayload({ addendumId: null, field: "is_business_approved", value: true }, "  ok ")).toEqual({
			is_business_approved: true,
			comment: "ok",
		});
	});

	it("wraps addendum decisions and omits blank comments", () => {
		expect(buildContractApprovalPayload({ addendumId: 7, field: "is_signed", value: false }, "   ")).toEqual({
			addenda: [{ id: 7, is_signed: false, comment: undefined }],
		});
	});
});
