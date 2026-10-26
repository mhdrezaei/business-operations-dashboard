import type { NotificationRuleDto } from "./notification-rules.types";
import { describe, expect, it } from "vitest";
import { findLatestRunByJobName, getDaysBeforeEndError, resolveKeptPayloadTemplate } from "./notification-rules.utils";

describe("notification rule validation", () => {
	it("limits missing-performance rules to 1..30 days", () => {
		expect(getDaysBeforeEndError("PERFORMANCE_MISSING_PREV_MONTH", [31])).not.toBeNull();
		expect(getDaysBeforeEndError("PERFORMANCE_MISSING_PREV_MONTH_SMS", [1, 30])).toBeNull();
	});

	it("needs positive days for pending rules and at least one day", () => {
		expect(getDaysBeforeEndError("SIGN_PENDING", [0])).not.toBeNull();
		expect(getDaysBeforeEndError("CONTRACT_EXPIRY", [0, 7])).toBeNull();
		expect(getDaysBeforeEndError("CONTRACT_EXPIRY", [])).not.toBeNull();
	});
});

describe("saved payload template", () => {
	const rule = { code: "CONTRACT_EXPIRY", payload_template: { message: { title_fa: "x" } } } as unknown as NotificationRuleDto;

	it("is kept only for the same non-pending rule code", () => {
		expect(resolveKeptPayloadTemplate("CONTRACT_EXPIRY", rule)).toEqual(rule.payload_template);
		expect(resolveKeptPayloadTemplate("PERFORMANCE_MISSING_PREV_MONTH", rule)).toBeUndefined();
		expect(resolveKeptPayloadTemplate("CONTRACT_EXPIRY", null)).toBeUndefined();
		expect(resolveKeptPayloadTemplate("SIGN_PENDING", { ...rule, code: "SIGN_PENDING" })).toBeUndefined();
	});
});

describe("latest run per job", () => {
	it("picks the newest run of the job", () => {
		const runs = [
			{ id: 1, job_name: "a", started_at: "2025-01-01T00:00:00Z" },
			{ id: 2, job_name: "a", started_at: "2025-01-02T00:00:00Z" },
			{ id: 3, job_name: "b", started_at: "2025-01-03T00:00:00Z" },
		] as never[];
		expect(findLatestRunByJobName(runs, "a")?.id).toBe(2);
		expect(findLatestRunByJobName(runs, "c")).toBeUndefined();
	});
});
