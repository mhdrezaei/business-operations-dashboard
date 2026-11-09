import { describe, expect, it } from "vitest";
import { openApiServiceFieldsSchema } from "./openapi.schema";

function fixedPricing(amount: number) {
	return {
		type: "fixed",
		fixedAmount: amount,
		rows: [],
		sections: [],
	};
}

describe("openAPI addenda pricing", () => {
	it("accepts separate receipt registration and bill inquiry pricing", () => {
		const result = openApiServiceFieldsSchema.safeParse({
			contractModel: "legacy",
			packageMode: null,
			legacyPricing: {
				paymentRegistration: fixedPricing(100),
				billInquiry: fixedPricing(200),
			},
			addenda: [{
				startYear: 1404,
				startMonth: 1,
				endYear: 1404,
				endMonth: 2,
				legacyPricing: {
					paymentRegistration: fixedPricing(300),
					billInquiry: fixedPricing(400),
				},
			}],
		});

		expect(result.success).toBe(true);
	});

	it("ignores the empty legacy pricing left on a package contract and its addenda", () => {
		const emptyLegacy = { paymentRegistration: { type: null, rows: [], sections: [] }, billInquiry: { type: null, rows: [], sections: [] } };
		const result = openApiServiceFieldsSchema.safeParse({
			contractModel: "package",
			packageMode: "OR",
			plans: [],
			legacyPricing: emptyLegacy,
			addenda: [{ startYear: 1404, startMonth: 1, endYear: 1404, endMonth: 2, contractModel: "package", packageMode: "OR", plans: [], legacyPricing: emptyLegacy }],
		});
		expect(result.success).toBe(true);
		if (result.success)
			expect(result.data).not.toHaveProperty("legacyPricing");
	});
});
