import { describe, expect, it } from "vitest";
import { formatHistoryDate } from "./contract-approval-history.utils";

describe("formatHistoryDate", () => {
	it("formats API timestamps with the globally configured Jalali calendar", () => {
		const result = formatHistoryDate("2026-08-09T17:10:57.462418+03:30");

		expect(result).toMatch(/^۱۴۰۵\/۰۵\/۱۸ - /);
	});

	it("returns invalid values without throwing", () => {
		expect(formatHistoryDate("invalid-date")).toBe("invalid-date");
	});
});
