import { describe, expect, it } from "vitest";
import { buildPerformanceReportParams } from "./performance-report.params";
import {
	buildOperatorGovernmentParams,
	DEFAULT_OPERATOR_GOVERNMENT_FILTERS,
	flattenFinanceDepartmentRows,
	formatFinanceRowType,
	getReportTotalsRowLabel,
	getReportTotalsRows,
	normalizeFinanceDepartmentTotals,
	normalizeOperatorGovernmentRow,
	resolveSmsCommissionScope,
} from "./sms-report-variants";

const labels = { government: "gov", profit: "profit", overall: "overall" };

describe("flattenFinanceDepartmentRows", () => {
	const rows = flattenFinanceDepartmentRows([{
		service_id: 1,
		company_id: 7,
		company_name: "Acme",
		fiscal_year: 1404,
		fiscal_month: 2,
		total_value: 100,
		total_income_government: 30,
		total_profit: 20,
		price_government: 0.3,
		price_profit: null,
		channels: [
			{ operator: "mci", language: "fa", value: 60, price: 1.5, income_operator: 90 },
			{ operator: "irancell", language: null, value: 40, income_operator: 10 },
		],
	}]);

	it("emits channel rows then the government and Karashab shares", () => {
		expect(rows.map(row => row.row_type)).toEqual(["operator", "operator", "government", "profit"]);
		expect(rows[0]).toMatchObject({ operator: "MCI", language: "FA", value: 60, price: 1.5, income_financial: 90 });
		expect(rows[1]).toMatchObject({ operator: "IRANCELL", language: null, price: null });
		expect(rows[2]).toMatchObject({ value: 100, price: 0.3, income_financial: 30 });
		expect(rows[3]).toMatchObject({ value: 100, price: null, income_financial: 20 });
	});

	it("keeps the company and period on every row with unique ids", () => {
		expect(rows.every(row => row.company_name === "Acme" && row.fiscal_month === 2)).toBe(true);
		expect(new Set(rows.map(row => row.id)).size).toBe(rows.length);
	});
});

describe("formatFinanceRowType", () => {
	const op = (value: string) => `op:${value}`;
	const lang = (value: string) => `lang:${value}`;

	it("labels shares and channels", () => {
		expect(formatFinanceRowType({ row_type: "government" } as never, labels, op, lang)).toBe("gov");
		expect(formatFinanceRowType({ row_type: "profit" } as never, labels, op, lang)).toBe("profit");
		expect(formatFinanceRowType({ row_type: "operator", operator: "MCI", language: "FA" } as never, labels, op, lang)).toBe("op:MCI - lang:FA");
		expect(formatFinanceRowType({ row_type: "operator", operator: "MCI" } as never, labels, op, lang)).toBe("op:MCI");
		expect(formatFinanceRowType({ row_type: "operator" } as never, labels, op, lang)).toBe("overall");
	});
});

describe("normalizeFinanceDepartmentTotals", () => {
	it("maps the totals to the shared summary shape", () => {
		expect(normalizeFinanceDepartmentTotals({ total_value: "10", total_income_operator: "5", total_income: "9" })).toMatchObject({ value: 10, income_financial: 9, total_income_operator: 5 });
	});

	it("falls back to the operator income and ignores missing totals", () => {
		expect(normalizeFinanceDepartmentTotals({ total_value: 1, total_income_operator: 4 })?.income_financial).toBe(4);
		expect(normalizeFinanceDepartmentTotals(null)).toBeNull();
	});
});

describe("getReportTotalsRows", () => {
	it("wraps a single totals object", () => {
		expect(getReportTotalsRows({ value: 3 })).toEqual([{ value: 3 }]);
	});

	it("passes lists through", () => {
		expect(getReportTotalsRows([{ value: 1 }, { value: 2 }])).toHaveLength(2);
	});

	it("expands totals per contract unit", () => {
		const rows = getReportTotalsRows({ "GB/month": { value: 5 }, "Mbps": { value: 7 } });
		expect(rows).toEqual([{ value: 5, contract_unit: "GB/month" }, { value: 7, contract_unit: "Mbps" }]);
		expect(getReportTotalsRowLabel("total", rows[0])).toBe("total (GB/month)");
	});

	it("returns nothing without totals", () => {
		expect(getReportTotalsRows(null)).toEqual([]);
		expect(getReportTotalsRowLabel("total", { value: 1 } as never)).toBe("total");
	});
});

describe("buildOperatorGovernmentParams", () => {
	const input = {
		serviceId: 2,
		periodType: "sh" as const,
		periods: ["1404-5", "1404-4"],
		contractType: "all" as const,
		canFilterSmsCommission: true,
		filters: { ...DEFAULT_OPERATOR_GOVERNMENT_FILTERS, operators: ["MCI", "IRANCELL"], languages: ["FA"] },
		aggregation: [],
		page: 1,
		pageSize: 20,
		total: true,
	};

	it("builds the query with the chosen mode and filters", () => {
		expect(buildOperatorGovernmentParams(input)).toMatchObject({
			service_id: 2,
			mode: "operators",
			sh_periods: "1404-4,1404-5",
			operators: "MCI,IRANCELL",
			languages: "FA",
			total: true,
		});
		expect(buildOperatorGovernmentParams({ ...input, filters: DEFAULT_OPERATOR_GOVERNMENT_FILTERS })?.operators).toBeUndefined();
		expect(buildOperatorGovernmentParams(input)?.sms_commission).toBeUndefined();
	});

	it("sends the scope only to holders of the commission permission", () => {
		const filters = { ...input.filters, smsCommission: "sms_only" as const };
		expect(buildOperatorGovernmentParams({ ...input, filters })?.sms_commission).toBe(false);
		expect(buildOperatorGovernmentParams({ ...input, filters, canFilterSmsCommission: false })?.sms_commission).toBeUndefined();
	});

	it("never asks for commission-only unofficial contracts", () => {
		expect(resolveSmsCommissionScope("commission_only", "unofficial")).toBe("sms_only");
		expect(resolveSmsCommissionScope("commission_only", "official")).toBe("commission_only");
	});

	it("uses fiscal periods and drops company aggregation", () => {
		const query = buildOperatorGovernmentParams({ ...input, periodType: "fiscal", aggregation: ["by_company", "by_month"] });
		expect(query).toMatchObject({ fiscal_periods: "1404-4,1404-5", by_month: true });
		expect(query).not.toHaveProperty("by_company");
		expect(query?.sh_periods).toBeUndefined();
	});

	it("needs a service and periods", () => {
		expect(buildOperatorGovernmentParams({ ...input, serviceId: null })).toBeNull();
		expect(buildOperatorGovernmentParams({ ...input, periods: [] })).toBeNull();
	});
});

describe("overall sms report params", () => {
	it("sends overall_sms_performance only when requested", () => {
		const base = {
			serviceId: 2,
			serviceCode: "sms",
			periodType: "sh" as const,
			periods: ["1404-5"],
			companyType: "ALL",
			requiresCompanyType: false,
			supportsContractType: true,
			contractType: "all" as const,
			selectedCompanyIds: [],
			availableCompanyIds: [],
			requireCompanies: false,
			aggregation: [],
			isUnitConversion: false,
			showBaseUnit: false,
			conversionRatio: null,
			page: 1,
			pageSize: 20,
			total: true,
		};
		expect(buildPerformanceReportParams({ ...base, overallSmsPerformance: true })?.overall_sms_performance).toBe(true);
		expect(buildPerformanceReportParams(base)?.overall_sms_performance).toBeUndefined();
	});
});

describe("normalizeOperatorGovernmentRow", () => {
	const row = { sh_year: 1404, sh_month: 1, fiscal_year: 1403, fiscal_month: "10" } as never;

	it("maps the fiscal period onto sh_year/sh_month and keeps the calendar year", () => {
		expect(normalizeOperatorGovernmentRow(row, "fiscal")).toMatchObject({ sh_year: 1403, sh_month: 10, sh_year_shamsi: 1404 });
	});

	it("leaves calendar rows untouched", () => {
		expect(normalizeOperatorGovernmentRow(row, "sh")).toBe(row);
	});
});
