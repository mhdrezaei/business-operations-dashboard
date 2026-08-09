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
});
