import type { PerformanceListItem } from "#src/features/performance/api/performances.api";
import { describe, expect, it } from "vitest";
import { buildSeparatedBreakdown, getOpenApiOperationRowValue, sumOpenApiOperationRowValues } from "./openapi-operation-rows";

const row = (fields: Record<string, unknown>) => fields as unknown as PerformanceListItem;

// Real month 1410/01 of a separated contract.
const separatedMonth = [
	row({ operation_type: "BILL_INQUIRY_MIDTERM", income: "11800.62", expense: "0.00", profit: "11800.62" }),
	row({ operation_type: "BILL_INQUIRY_ENDTERM", income: "115324.56", expense: "0.00", profit: "115324.56" }),
	row({ operation_type: "RECEIPT_REGISTER_CONNECTED", income: "11100.00", expense: "8880.00", profit: "2220.00" }),
	row({ operation_type: "RECEIPT_REGISTER_DISCONNECTED", income: "13320.00", expense: "8924.40", profit: "4395.60" }),
];

describe("buildSeparatedBreakdown", () => {
	it("returns income, expense and profit of every operation in a fixed order", () => {
		expect(buildSeparatedBreakdown([...separatedMonth].reverse())).toEqual([
			{ operationType: "BILL_INQUIRY_MIDTERM", income: 11800.62, expense: 0, profit: 11800.62 },
			{ operationType: "BILL_INQUIRY_ENDTERM", income: 115324.56, expense: 0, profit: 115324.56 },
			{ operationType: "RECEIPT_REGISTER_CONNECTED", income: 11100, expense: 8880, profit: 2220 },
			{ operationType: "RECEIPT_REGISTER_DISCONNECTED", income: 13320, expense: 8924.4, profit: 4395.6 },
		]);
	});

	it("skips operations without a row and keeps missing numbers as null", () => {
		expect(buildSeparatedBreakdown([row({ operation_type: "bill_inquiry_endterm", income: "5" })])).toEqual([
			{ operationType: "BILL_INQUIRY_ENDTERM", income: 5, expense: null, profit: null },
		]);
		expect(buildSeparatedBreakdown([])).toEqual([]);
	});
});

describe("operation row helpers", () => {
	it("matches operation types case-insensitively and skips empty values", () => {
		const rows = [row({ operation_type: " bill_inquiry ", income: "", profit: "5" })];

		expect(getOpenApiOperationRowValue(rows, "BILL_INQUIRY", ["income", "profit"])).toBe("5");
		expect(getOpenApiOperationRowValue(rows, "RECEIPT_REGISTER", ["income"])).toBeNull();
	});

	it("ignores rows without a numeric value when summing", () => {
		const rows = [row({ operation_type: "A", income: "2" }), row({ operation_type: "B", income: "x" })];

		expect(sumOpenApiOperationRowValues(rows, ["A", "B", "C"], ["income"])).toBe(2);
	});
});
