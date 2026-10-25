import type { ReportParamsInput } from "./performance-report.params";
import { describe, expect, it } from "vitest";
import { getAllowedAggregationKeys, getTrafficReportLayout } from "../ui/constants";
import {
	buildPerformanceReportParams,
	buildReportAggregationParams,
	buildReportAvailabilityQuery,
	getDefaultFinancialColumns,
	getFinancialColumnKeys,
	isEditableReportPeriod,
	prunePeriodsToAvailability,
} from "./performance-report.params";

const baseInput: ReportParamsInput = {
	serviceId: 3,
	serviceCode: "traffic",
	periodType: "sh",
	periods: ["1404-5", "1404-4"],
	companyType: ["CP"],
	requiresCompanyType: true,
	supportsContractType: true,
	contractType: "all",
	selectedCompanyIds: [1, 2],
	availableCompanyIds: [1, 2],
	requireCompanies: false,
	aggregation: [],
	isUnitConversion: true,
	showBaseUnit: true,
	conversionRatio: null,
	page: 1,
	pageSize: 20,
	total: false,
};

describe("prunePeriodsToAvailability", () => {
	it("drops selected periods that are no longer available", () => {
		expect(prunePeriodsToAvailability(["1404-4", "1404-5"], ["1404-5", "1404-6"])).toEqual(["1404-5"]);
	});

	it("keeps the same array when everything is still available", () => {
		const selected = ["1404-4"];
		expect(prunePeriodsToAvailability(selected, ["1404-4", "1404-5"])).toBe(selected);
	});
});

describe("buildReportAvailabilityQuery", () => {
	const input = {
		serviceId: 3,
		periodType: "fiscal" as const,
		periods: [] as string[],
		companyType: ["CP", "IXP"],
		supportsContractType: true,
		contractType: "official" as const,
		aggregation: ["by_company" as const],
		isCollocation: false,
	};

	it("asks for the available periods with the contract type and aggregation flags", () => {
		expect(buildReportAvailabilityQuery(input)).toEqual({
			service_id: 3,
			period_type: "fiscal",
			company_type: "CP,IXP",
			is_official: true,
			by_company: true,
		});
	});

	it("sends fiscal_periods, not sh_periods, in fiscal mode", () => {
		const query = buildReportAvailabilityQuery({ ...input, periods: ["1404-2", "1404-1"] });
		expect(query).toMatchObject({ fiscal_periods: "1404-1,1404-2", is_official: true });
		expect(query).not.toHaveProperty("sh_periods");
	});

	it("sends sh_periods in shamsi mode and skips is_official for services without contract types", () => {
		const query = buildReportAvailabilityQuery({ ...input, periodType: "sh", periods: ["1404-3"], supportsContractType: false });
		expect(query).toMatchObject({ sh_periods: "1404-3" });
		expect(query?.is_official).toBeUndefined();
	});

	it("forwards the overall SMS flag", () => {
		expect(buildReportAvailabilityQuery({ ...input, overallSmsPerformance: true })).toMatchObject({ overall_sms_performance: true });
	});

	it("returns null without a service", () => {
		expect(buildReportAvailabilityQuery({ ...input, serviceId: null })).toBeNull();
	});
});

describe("buildPerformanceReportParams", () => {
	it("sends raw_values for unit-converted traffic while the base unit is shown", () => {
		expect(buildPerformanceReportParams(baseInput)).toMatchObject({ raw_values: true, sh_periods: "1404-4,1404-5" });
	});

	it("sends the conversion ratio instead of raw_values when the base unit is hidden", () => {
		const params = buildPerformanceReportParams({ ...baseInput, showBaseUnit: false, conversionRatio: 0.5 });
		expect(params?.default_conversion_ratio).toBe(0.5);
		expect(params).not.toHaveProperty("raw_values", true);
	});

	it("ignores an out-of-range ratio", () => {
		expect(buildPerformanceReportParams({ ...baseInput, showBaseUnit: false, conversionRatio: 11 })?.default_conversion_ratio).toBeUndefined();
	});

	it("never sends raw_values or a ratio for COLLOCATION", () => {
		const params = buildPerformanceReportParams({ ...baseInput, companyType: ["COLLOCATION"], isUnitConversion: false, showBaseUnit: true, conversionRatio: 1 });
		expect(params?.raw_values).toBeUndefined();
		expect(params?.default_conversion_ratio).toBeUndefined();
	});

	it("uses fiscal_periods in fiscal mode", () => {
		const params = buildPerformanceReportParams({ ...baseInput, periodType: "fiscal" });
		expect(params).toHaveProperty("fiscal_periods", "1404-4,1404-5");
		expect(params).not.toHaveProperty("sh_periods");
	});

	it("omits company_ids when every available company is selected", () => {
		expect(buildPerformanceReportParams(baseInput)?.company_ids).toBeUndefined();
		expect(buildPerformanceReportParams({ ...baseInput, selectedCompanyIds: [2] })?.company_ids).toBe("2");
	});

	it("sends no request when the user emptied a required company selection", () => {
		expect(buildPerformanceReportParams({ ...baseInput, selectedCompanyIds: [], requireCompanies: true })).toBeNull();
	});

	it("sends no request without periods or a required company type", () => {
		expect(buildPerformanceReportParams({ ...baseInput, periods: [] })).toBeNull();
		expect(buildPerformanceReportParams({ ...baseInput, companyType: null })).toBeNull();
	});

	it("only sends is_official for services that support contract types", () => {
		expect(buildPerformanceReportParams({ ...baseInput, contractType: "unofficial" })?.is_official).toBe(false);
		expect(buildPerformanceReportParams({ ...baseInput, contractType: "unofficial", supportsContractType: false })?.is_official).toBeUndefined();
	});

	it("sends by_data_center only for COLLOCATION with an aggregation", () => {
		const collocation = { ...baseInput, companyType: ["COLLOCATION"], isUnitConversion: false };
		expect(buildPerformanceReportParams({ ...collocation, aggregation: ["by_company"] })).toMatchObject({ by_company: true, by_data_center: false });
		expect(buildPerformanceReportParams({ ...collocation, aggregation: ["by_company", "by_data_center"] })).toMatchObject({ by_data_center: true });
		expect(buildPerformanceReportParams(collocation)).not.toHaveProperty("by_data_center");
		expect(buildPerformanceReportParams({ ...baseInput, aggregation: ["by_company"] })).not.toHaveProperty("by_data_center");
	});
});

describe("buildReportAggregationParams", () => {
	it("maps selected aggregation keys to flags", () => {
		expect(buildReportAggregationParams(["by_month", "by_language"])).toEqual({ by_month: true, by_language: true });
	});
});

describe("report column sets", () => {
	it("starts with profit and the company type column off", () => {
		expect(getDefaultFinancialColumns("traffic", "normal", false)).not.toContain("profit");
		expect(getDefaultFinancialColumns("sales-agency", "normal", false)).not.toContain("total");
		expect(getDefaultFinancialColumns("sms", "operatorGovernment", false)).not.toContain("total");
		expect(getDefaultFinancialColumns("sms", "normal", false)).not.toContain("companyType");
		expect(getDefaultFinancialColumns("default", "normal", false)).not.toContain("profit");
	});

	it("shows the company type by default for sales agency only", () => {
		expect(getDefaultFinancialColumns("sales-agency", "normal", false)).toContain("companyType");
	});

	it("turns the base unit on for unit-converted traffic", () => {
		expect(getDefaultFinancialColumns("traffic", "normal", true)[0]).toBe("showBaseUnit");
		expect(getFinancialColumnKeys("traffic", "normal", false)).not.toContain("showBaseUnit");
	});

	it("offers the company type switch for SMS, PSP, traffic and sales agency", () => {
		(["sms", "psp", "traffic", "sales-agency"] as const).forEach((layout) => {
			expect(getFinancialColumnKeys(layout, "normal", false)).toContain("companyType");
		});
		expect(getFinancialColumnKeys("shahkar", "normal", false)).not.toContain("companyType");
	});
});

describe("traffic layout and aggregation keys", () => {
	it("treats every unit-converted type as the cp layout", () => {
		expect(getTrafficReportLayout(["TCI"])).toBe("cp");
		expect(getTrafficReportLayout(["CP", "IXP"])).toBe("cp");
		expect(getTrafficReportLayout(["COLLOCATION"])).toBe("collocation");
		expect(getTrafficReportLayout(["CP", "COLLOCATION"])).toBe("mixed-collocation");
	});

	it("offers the data center switch only for COLLOCATION", () => {
		expect(getAllowedAggregationKeys("traffic", true)).toContain("by_data_center");
		expect(getAllowedAggregationKeys("traffic")).not.toContain("by_data_center");
	});
});

describe("isEditableReportPeriod", () => {
	it("blocks periods before 1404/4", () => {
		expect(isEditableReportPeriod(1404, 3)).toBe(false);
		expect(isEditableReportPeriod(1403, 12)).toBe(false);
		expect(isEditableReportPeriod(1404, 4)).toBe(true);
		expect(isEditableReportPeriod(1405, 1)).toBe(true);
		expect(isEditableReportPeriod(null, 4)).toBe(false);
	});
});
