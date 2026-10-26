import { describe, expect, it } from "vitest";
import { telecomFrameServiceFieldsSchema } from "./telecom-frame.schema";

const validType = { contractType: "DEVELOPMENT", revenue: 100, manHours: 0 };
const period = { startYear: 1404, startMonth: 1, endYear: 1404, endMonth: 2 };

function issuePaths(input: unknown) {
	const result = telecomFrameServiceFieldsSchema.safeParse(input);
	return result.success ? [] : result.error.issues.map(issue => issue.path.join("."));
}

describe("telecom frame schema", () => {
	it("accepts a minimal valid contract", () => {
		expect(issuePaths({ contractTypes: [validType] })).toEqual([]);
	});

	it("requires at least one contract type", () => {
		expect(issuePaths({})).toContain("contractTypes");
	});

	it("requires positive revenue and non-negative man-hours", () => {
		expect(issuePaths({ contractTypes: [{ ...validType, revenue: 0, manHours: null }] }))
			.toEqual(expect.arrayContaining(["contractTypes.0.revenue", "contractTypes.0.manHours"]));
		expect(issuePaths({ contractTypes: [{ ...validType, manHours: -1 }] })).toContain("contractTypes.0.manHours");
	});

	it("validates penalty fields only when the penalty is enabled", () => {
		expect(issuePaths({ contractTypes: [validType], hasPenalty: false, penalty: { initialGraceDays: null } })).toEqual([]);
		expect(issuePaths({ contractTypes: [validType], hasPenalty: true, penalty: { initialGraceDays: 1 } }))
			.toEqual(["penalty.toleranceDays", "penalty.penaltyPercent"]);
	});

	it("rejects a status row ending before it starts", () => {
		expect(issuePaths({
			contractTypes: [validType],
			statusTimeline: [{ status: "ACTIVE", startDate: "2026-02-01", endDateExclusive: "2026-01-01", note: "" }],
		})).toEqual(["statusTimeline.0.endDateExclusive"]);
	});

	it("requires contract types on every addendum and sub-addendum", () => {
		expect(issuePaths({
			contractTypes: [validType],
			addenda: [{ ...period, contractTypes: [validType], children: [{ ...period }] }, { ...period }],
		})).toEqual(["addenda.0.children.0.contractTypes", "addenda.1.contractTypes"]);
	});
});
