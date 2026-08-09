import { describe, expect, it } from "vitest";
import { addendumSchema } from "./addenda.schema";
import { defaultAddendumValue } from "./addenda.types";

const dates = {
	startYear: 1404,
	startMonth: 1,
	endYear: 1404,
	endMonth: 2,
};

describe("addendum pricing validation", () => {
	it("does not validate an unrelated hidden pricing field", () => {
		const result = addendumSchema.safeParse({
			...structuredClone(defaultAddendumValue),
			...dates,
			operatorRevenue: {},
			governmentRevenue: {},
			profit: {},
			initialCommission: 10,
		});

		expect(result.success).toBe(true);
	});

	it("still validates contract pricing when that field is actually present", () => {
		const result = addendumSchema.safeParse({
			...dates,
			contractPricing: {
				type: null,
				fixedAmount: null,
				rows: [],
				sections: [],
			},
		});

		expect(result.success).toBe(false);
	});
});
