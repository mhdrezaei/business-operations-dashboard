import { describe, expect, it } from "vitest";
import { toNum } from "./format";
import { buildShPeriodsRange, jalaliPartsOf, monthIndex, shiftJalaliMonth } from "./jalali";

describe("shiftJalaliMonth", () => {
	it("moves across year boundaries in both directions", () => {
		expect(shiftJalaliMonth({ year: 1405, month: 1 }, -1)).toEqual({ year: 1404, month: 12 });
		expect(shiftJalaliMonth({ year: 1404, month: 12 }, 1)).toEqual({ year: 1405, month: 1 });
		expect(shiftJalaliMonth({ year: 1405, month: 6 }, -17)).toEqual({ year: 1404, month: 1 });
	});

	it("is consistent with monthIndex", () => {
		const from = { year: 1404, month: 10 };
		expect(monthIndex(shiftJalaliMonth(from, 11)) - monthIndex(from)).toBe(11);
	});
});

describe("buildShPeriodsRange", () => {
	it("lists every month from start to end inclusive", () => {
		expect(buildShPeriodsRange({ year: 1404, month: 11 }, { year: 1405, month: 2 })).toEqual([
			{ year: 1404, month: 11 },
			{ year: 1404, month: 12 },
			{ year: 1405, month: 1 },
			{ year: 1405, month: 2 },
		]);
	});

	it("stops at the maximum length", () => {
		expect(buildShPeriodsRange({ year: 1400, month: 1 }, { year: 1410, month: 1 }, 36)).toHaveLength(36);
	});
});

describe("jalaliPartsOf", () => {
	it("converts a Gregorian ISO date to the Jalali month", () => {
		expect(jalaliPartsOf("2026-10-19")).toEqual({ year: 1405, month: 7 });
		expect(jalaliPartsOf("2026-03-21T10:00:00+03:30")).toEqual({ year: 1405, month: 1 });
	});

	it("returns null for invalid input", () => {
		expect(jalaliPartsOf(null)).toBeNull();
		expect(jalaliPartsOf("not-a-date")).toBeNull();
	});
});

describe("toNum", () => {
	it("keeps missing values as null instead of zero", () => {
		expect(toNum(null)).toBeNull();
		expect(toNum(undefined)).toBeNull();
		expect(toNum("")).toBeNull();
		expect(toNum("abc")).toBeNull();
		expect(toNum("12500000000.00")).toBe(12500000000);
		expect(toNum(0)).toBe(0);
	});
});
