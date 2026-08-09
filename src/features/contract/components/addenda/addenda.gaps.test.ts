import { describe, expect, it } from "vitest";
import { buildAddendaMonthsByYear, isAvailableAddendaMonth } from "./addenda.gaps";

describe("addenda gaps options", () => {
	it("uses the same missing years and months returned for the original contract", () => {
		const options = buildAddendaMonthsByYear({
			1404: [4, 5],
			1405: [1, 2, 3],
			1410: [11, 12],
		});

		expect([...options.keys()]).toEqual([1404, 1405, 1410]);
		expect(options.get(1405)).toEqual([1, 2, 3]);
	});

	it("keeps the current contract range available while editing", () => {
		const options = buildAddendaMonthsByYear(
			{ 1404: [12], 1406: [1] },
			{ startYear: 1405, startMonth: 11, endYear: 1406, endMonth: 2 },
		);

		expect(options.get(1405)).toEqual([11, 12]);
		expect(options.get(1406)).toEqual([1, 2]);
		expect(isAvailableAddendaMonth(options, 1405, 11)).toBe(true);
		expect(isAvailableAddendaMonth(options, 1405, 10)).toBe(false);
	});
});
