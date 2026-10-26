import { describe, expect, it } from "vitest";
import { ALL_COMPANY_TYPES, getReportCompanyTypeLabel, hasMixedCompanyTypeIncluding, isOnlyCompanyType, isUnitConversionCompanyType, normalizeCompanyTypeFilter } from "./company-type";

const options = [{ label: "شرکت‌های CP", value: "CP" }];

describe("getReportCompanyTypeLabel", () => {
	it("uses the display label returned by the report API", () => {
		expect(getReportCompanyTypeLabel({ CP: "شرکت‌های CP" }, options)).toBe("شرکت‌های CP");
	});

	it("falls back to the configured label for string values", () => {
		expect(getReportCompanyTypeLabel("CP", options)).toBe("شرکت‌های CP");
	});

	it("shows a placeholder when the response has no company type", () => {
		expect(getReportCompanyTypeLabel(null, options)).toBe("-");
	});
});

describe("normalizeCompanyTypeFilter", () => {
	it("joins multiple traffic company types for the API", () => {
		expect(normalizeCompanyTypeFilter(["CP", "IXP", "TCI"])).toBe("CP,IXP,TCI");
	});

	it("omits the SMS select-all value", () => {
		expect(normalizeCompanyTypeFilter(ALL_COMPANY_TYPES)).toBeUndefined();
	});

	it("detects a single CP selection inside the traffic multi-select", () => {
		expect(isOnlyCompanyType(["CP"], "CP")).toBe(true);
		expect(isOnlyCompanyType(["CP", "IXP"], "CP")).toBe(false);
	});

	it("detects collocation only when it is part of a mixed selection", () => {
		expect(hasMixedCompanyTypeIncluding(["CP", "COLLOCATION"], "COLLOCATION")).toBe(true);
		expect(hasMixedCompanyTypeIncluding(["COLLOCATION"], "COLLOCATION")).toBe(false);
	});
});

describe("isUnitConversionCompanyType", () => {
	it("applies to CP, IXP, TCI and PREMIUM selections", () => {
		expect(isUnitConversionCompanyType(["CP"])).toBe(true);
		expect(isUnitConversionCompanyType(["TCI", "IXP", "PREMIUM"])).toBe(true);
	});

	it("opts out when COLLOCATION is selected or nothing is", () => {
		expect(isUnitConversionCompanyType(["COLLOCATION"])).toBe(false);
		expect(isUnitConversionCompanyType(["CP", "COLLOCATION"])).toBe(false);
		expect(isUnitConversionCompanyType(null)).toBe(false);
	});
});
