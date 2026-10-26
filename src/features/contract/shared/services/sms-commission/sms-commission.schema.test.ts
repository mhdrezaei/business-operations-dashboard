import { describe, expect, it } from "vitest";
import { smsCommissionServiceFieldsSchema } from "./sms-commission.schema";

const valid = {
	agent: 1,
	initialCommission: 10,
	finalCommission: 12,
	expertPercent: 60,
	telecomPercent: 40,
	firstPartySharePercent: 50,
	regionSharePercent: 30,
	salesAgentSharePercent: 20,
};

function issuePaths(value: unknown) {
	const result = smsCommissionServiceFieldsSchema.safeParse(value);
	return result.success ? [] : result.error.issues.map(issue => issue.path.join("."));
}

describe("sms commission schema", () => {
	it("accepts a final fee equal to or above the initial fee", () => {
		expect(issuePaths(valid)).toEqual([]);
		expect(issuePaths({ ...valid, finalCommission: 10 })).toEqual([]);
	});

	it("rejects a final fee below the initial fee, also inside addenda", () => {
		expect(issuePaths({ ...valid, finalCommission: 9 })).toEqual(["finalCommission"]);
		expect(issuePaths({ ...valid, addenda: [{ ...valid, startYear: 1405, startMonth: 1, endYear: 1405, endMonth: 2, finalCommission: 1 }] })).toContain("addenda.0.finalCommission");
	});
});
