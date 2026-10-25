import { describe, expect, it } from "vitest";
import { buildAllowedStartMonths, buildDefaultAddendumPeriod, getAddendumEndMonths, isAllowedAddendumStart, toAddendumRange, validateAddendaPeriods } from "./addenda.periods";

const parent = { startYear: 1404, startMonth: 11, endYear: 1405, endMonth: 2 };

describe("addenda periods", () => {
	it("allows starts inside the parent range and exactly one month after it", () => {
		const months = buildAllowedStartMonths(parent);
		expect([...months.keys()]).toEqual([1404, 1405]);
		expect(months.get(1404)).toEqual([11, 12]);
		expect(months.get(1405)).toEqual([1, 2, 3]);
		expect(isAllowedAddendumStart(months, 1405, 3)).toBe(true);
		expect(isAllowedAddendumStart(months, 1405, 4)).toBe(false);
		expect(isAllowedAddendumStart(months, 1404, 10)).toBe(false);
	});

	it("rolls over the year for the month after the parent end", () => {
		const months = buildAllowedStartMonths({ startYear: 1404, startMonth: 12, endYear: 1404, endMonth: 12 });
		expect(months.get(1405)).toEqual([1]);
	});

	it("limits end months to the start month inside the start year", () => {
		expect(getAddendumEndMonths(1404, 1404, 5)).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
		expect(getAddendumEndMonths(1405, 1404, 5)).toHaveLength(12);
		expect(getAddendumEndMonths(null, 1404, 5)).toEqual([]);
	});

	it("flags starts outside the parent and overlapping siblings, recursively", () => {
		const issues = validateAddendaPeriods([
			{ startYear: 1404, startMonth: 11, endYear: 1404, endMonth: 12, children: [
				{ startYear: 1404, startMonth: 12, endYear: 1405, endMonth: 1 },
				{ startYear: 1405, startMonth: 5, endYear: 1405, endMonth: 6 },
			] },
			{ startYear: 1404, startMonth: 12, endYear: 1405, endMonth: 1 },
			{ startYear: 1405, startMonth: 8, endYear: 1405, endMonth: 9 },
		], parent, ["addenda"]);

		expect(issues).toEqual([
			{ path: ["addenda", 0, "children", 1, "startYear"], code: "start-outside-parent" },
			{ path: ["addenda", 2, "startYear"], code: "start-outside-parent" },
			{ path: ["addenda", 1, "startYear"], code: "overlap" },
		]);
	});

	it("skips the parent rule when the parent range is incomplete", () => {
		expect(toAddendumRange({ startYear: 1404, startMonth: null })).toBeNull();
		expect(validateAddendaPeriods([{ startYear: 1400, startMonth: 1, endYear: 1400, endMonth: 2 }], null, [])).toEqual([]);
	});

	it("prefills a new addendum with the first allowed month, or the last sibling's period", () => {
		expect(buildDefaultAddendumPeriod(parent)).toEqual({ startYear: 1404, startMonth: 11, endYear: 1404, endMonth: 11 });
		expect(buildDefaultAddendumPeriod(parent, { startYear: 1404, startMonth: 12, endYear: 1405, endMonth: 1 }))
			.toEqual({ startYear: 1404, startMonth: 12, endYear: 1405, endMonth: 1 });
	});
});
