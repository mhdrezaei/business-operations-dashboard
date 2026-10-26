import { describe, expect, it } from "vitest";
import { buildFallbackMonthsByYear, getRealStartMonths, getRealStartYears, mapRealStartPayload, validateRealStart } from "./contract-dates";

const trigger = { startYear: 1404, startMonth: 4 };

describe("contract-dates", () => {
	it("limits real-start options like the old frontend", () => {
		expect(getRealStartYears()).toEqual([1400, 1401, 1402, 1403, 1404]);
		expect(getRealStartMonths(1404)).toEqual([1, 2, 3]);
		expect(getRealStartMonths(1403)).toHaveLength(12);
	});

	it("builds fallback months starting from Tir 1404", () => {
		const months = buildFallbackMonthsByYear(1405);
		expect([...months.keys()]).toEqual([1404, 1405, 1406, 1407, 1408, 1409, 1410]);
		expect(months.get(1404)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
		expect(months.get(1405)).toHaveLength(12);
	});

	it("validates real start", () => {
		expect(validateRealStart(trigger, { year: null, month: null })).toBeNull();
		expect(validateRealStart(trigger, { year: 1403, month: null })).toBe("pair");
		expect(validateRealStart(trigger, { year: 1399, month: 1 })).toBe("min");
		expect(validateRealStart(trigger, { year: 1405, month: 1 })).toBe("max-year");
		expect(validateRealStart(trigger, { year: 1404, month: 4 })).toBe("max-month");
		expect(validateRealStart(trigger, { year: 1404, month: 3 })).toBeNull();
		expect(validateRealStart({ startYear: 1404, startMonth: 5 }, { year: 1403, month: 1 })).toBe("trigger");
	});

	it("maps payload only for the 1404/4 trigger with both values", () => {
		expect(mapRealStartPayload(trigger, { year: 1403, month: 5 })).toEqual({ real_start_jy: 1403, real_start_jm: 5 });
		expect(mapRealStartPayload(trigger, { year: 1403, month: null })).toBeNull();
		expect(mapRealStartPayload({ startYear: 1404, startMonth: 5 }, { year: 1403, month: 5 })).toBeNull();
	});
});
