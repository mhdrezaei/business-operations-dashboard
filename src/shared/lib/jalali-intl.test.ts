import { describe, expect, it } from "vitest";
import { gregorianIsoToJalaliParts, jalaliPartsToGregorianIso } from "./jalali-intl";

// 1403 is a leap year (Esfand has 30 days), 1404 is not
const daysInMonth = (year: number, month: number) => (month <= 6 ? 31 : month < 12 || year === 1403 ? 30 : 29);

describe("jalali ↔ gregorian ISO", () => {
	it("converts both ways", () => {
		expect(jalaliPartsToGregorianIso({ year: 1404, month: 5, day: 15 })).toBe("2025-08-06");
		expect(gregorianIsoToJalaliParts("2025-08-06")).toEqual({ year: 1404, month: 5, day: 15 });
	});

	it("round-trips every day of a leap and a common year", () => {
		for (const year of [1403, 1404]) {
			for (let month = 1; month <= 12; month++) {
				for (let day = 1; day <= daysInMonth(year, month); day++) {
					const iso = jalaliPartsToGregorianIso({ year, month, day });
					expect(iso && gregorianIsoToJalaliParts(iso)).toEqual({ year, month, day });
				}
			}
		}
	});

	it("rejects invalid input", () => {
		expect(gregorianIsoToJalaliParts("2025-02-31")).toBeNull();
		expect(jalaliPartsToGregorianIso({ year: 1404, month: 7, day: 31 })).toBeNull();
	});
});
