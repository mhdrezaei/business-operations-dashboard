import { describe, expect, it } from "vitest";
import { trafficServiceFieldsSchema } from "./traffic.schema";

function fixedPricing(amount: number) {
	return { type: "fixed", fixedAmount: amount, rows: [], sections: [] };
}

const addendumDates = {
	startYear: 1404,
	startMonth: 1,
	endYear: 1404,
	endMonth: 2,
};

describe("traffic addenda locations", () => {
	it("requires both locations when the main contract has both", () => {
		const result = trafficServiceFieldsSchema.safeParse({
			isOfficial: true,
			tehranPricing: fixedPricing(100),
			provincePricing: fixedPricing(200),
			addenda: [{ ...addendumDates, tehranPricing: fixedPricing(300) }],
		});

		expect(result.success).toBe(false);
		if (!result.success)
			expect(result.error.issues.some(issue => issue.path.at(-1) === "provincePricing")).toBe(true);
	});

	it("accepts only Tehran when the main contract only has Tehran", () => {
		const result = trafficServiceFieldsSchema.safeParse({
			isOfficial: true,
			tehranPricing: fixedPricing(100),
			addenda: [{
				...addendumDates,
				tehranPricing: fixedPricing(300),
				children: [{ ...addendumDates, tehranPricing: fixedPricing(400) }],
			}],
		});

		expect(result.success).toBe(true);
	});

	it("accepts only province when the main contract only has province", () => {
		const result = trafficServiceFieldsSchema.safeParse({
			isOfficial: true,
			provincePricing: fixedPricing(200),
			addenda: [{ ...addendumDates, provincePricing: fixedPricing(400) }],
		});

		expect(result.success).toBe(true);
	});
});
