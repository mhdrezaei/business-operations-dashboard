import { describe, expect, it } from "vitest";
import { buildReportFileName, buildReportPrintTitle, formatPeriodsForFileName, parseReportPeriodKey } from "./report-file-name";

const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const format = {
	unitsPerYear: 12,
	unitLabel: (value: number) => MONTHS[value - 1],
	countLabel: (count: number, year: number) => `${count} ماه از ${year}`,
};
const periods = (...keys: string[]) => keys.map(key => parseReportPeriodKey(key)!);

describe("formatPeriodsForFileName", () => {
	it("formats a single period", () => {
		expect(formatPeriodsForFileName(periods("1405-7"), format)).toBe("مهر 1405");
	});

	it("formats a consecutive run with a range", () => {
		expect(formatPeriodsForFileName(periods("1405-6", "1405-1", "1405-3", "1405-2", "1405-4", "1405-5"), format)).toBe("فروردین تا شهریور 1405");
	});

	it("lists up to three scattered periods and counts more", () => {
		expect(formatPeriodsForFileName(periods("1405-1", "1405-4", "1405-7"), format)).toBe("فروردین، تیر، مهر 1405");
		expect(formatPeriodsForFileName(periods("1405-1", "1405-3", "1405-5", "1405-7"), format)).toBe("4 ماه از 1405");
	});

	it("uses compact year-month bounds across years", () => {
		expect(formatPeriodsForFileName(periods("1405-3", "1404-12"), format)).toBe("1404-12 تا 1405-03");
	});

	it("ignores duplicates and rejects invalid keys", () => {
		expect(formatPeriodsForFileName(periods("1405-7", "1405-7"), format)).toBe("مهر 1405");
		expect(parseReportPeriodKey("x-y")).toBeNull();
		expect(formatPeriodsForFileName([], format)).toBe("");
	});
});

describe("buildReportFileName", () => {
	it("joins the parts, strips forbidden characters and uses Latin digits", () => {
		expect(buildReportFileName({ title: "گزارش عملکرد", service: "API/مالی ۲", period: "مهر ۱۴۰۵" }, "xls"))
			.toBe("گزارش عملکرد - API مالی 2 - مهر 1405.xls");
	});

	it("skips missing parts", () => {
		expect(buildReportFileName({ title: "گزارش", service: null, period: "" }, "xls")).toBe("گزارش.xls");
	});

	it("shortens only the service part", () => {
		const name = buildReportFileName({ title: "گزارش عملکرد", service: "س".repeat(120), period: "فروردین تا شهریور 1405" }, "xls");
		expect(name.length).toBeLessThanOrEqual(84);
		expect(name).toContain("…");
		expect(name.endsWith(" - فروردین تا شهریور 1405.xls")).toBe(true);
	});

	it("builds a print title without extension", () => {
		expect(buildReportPrintTitle({ title: "گزارش", period: "مهر 1405" })).toBe("گزارش - مهر 1405");
	});
});
