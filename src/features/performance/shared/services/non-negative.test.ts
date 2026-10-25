import { describe, expect, it } from "vitest";
import { openapiPerformanceSchema } from "./openapi/openapi.schema";
import { pspPerformanceSchema } from "./psp/psp.schema";
import { shahkarPerformanceSchema } from "./shahkar/shahkar.schema";

describe("performance value schemas accept zero", () => {
	it("openapi legacy and legacy_2 values", () => {
		const zeros = { billInquiryValue: 0, receiptRegisterValue: 0, billInquiryMidtermValue: 0, billInquiryEndtermValue: 0, receiptRegisterConnectedValue: 0, receiptRegisterDisconnectedValue: 0 };
		expect(openapiPerformanceSchema.safeParse(zeros).success).toBe(true);
		expect(openapiPerformanceSchema.safeParse({ ...zeros, billInquiryValue: "0" }).success).toBe(true);
		expect(openapiPerformanceSchema.safeParse({ ...zeros, billInquiryValue: -1 }).success).toBe(false);
	});

	it("psp value and revenue", () => {
		expect(pspPerformanceSchema.safeParse({ performanceValue: 0, monthlyRevenue: 0 }).success).toBe(true);
		expect(pspPerformanceSchema.safeParse({ performanceValue: 0, monthlyRevenue: -1 }).success).toBe(false);
	});

	it("shahkar value", () => {
		expect(shahkarPerformanceSchema.safeParse({ performanceValue: 0 }).success).toBe(true);
		expect(shahkarPerformanceSchema.safeParse({ performanceValue: -1 }).success).toBe(false);
	});
});
