import { describe, expect, it } from "vitest";
import { formatHistoryDate, getHistoryStatus } from "./contract-approval-history.utils";

describe("formatHistoryDate", () => {
	it("formats API timestamps with the globally configured Jalali calendar", () => {
		const result = formatHistoryDate("2026-08-09T17:10:57.462418+03:30");

		expect(result).toMatch(/^۱۴۰۵\/۰۵\/۱۸ - /);
	});

	it("returns invalid values without throwing", () => {
		expect(formatHistoryDate("invalid-date")).toBe("invalid-date");
	});
});

describe("getHistoryStatus", () => {
	it("never reports a rejection for contract approval (is_signed)", () => {
		expect(getHistoryStatus({ field_name: "is_signed", new_value: false })).toBe("removed");
		expect(getHistoryStatus({ field_name: "is_signed", new_value: null })).toBe("removed");
		expect(getHistoryStatus({ field_name: "is_signed", new_value: true })).toBe("approved");
	});

	it("keeps rejected and undecided for commercial approval", () => {
		expect(getHistoryStatus({ field_name: "is_business_approved", new_value: false })).toBe("rejected");
		expect(getHistoryStatus({ field_name: "is_business_approved", new_value: null })).toBe("undecided");
	});
});
