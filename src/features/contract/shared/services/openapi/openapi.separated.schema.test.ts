import { describe, expect, it } from "vitest";
import { separatedPricingSchema } from "./openapi.separated.schema";

const fixed = (amount: number) => ({ type: "fixed", fixedAmount: amount, rows: [], sections: [] });
const valid = {
	walletChargeDiscountPercent: 10,
	midPeriodBillInquiry: fixed(1),
	endPeriodBillInquiry: fixed(1),
	connectedReceiptRegister: fixed(1),
	connectedKarashabSharePercent: 60,
	connectedPartnerSharePercent: 40,
	disconnectedReceiptRegister: fixed(1),
	disconnectedKarashabSharePercent: 50,
	disconnectedPartnerSharePercent: 50,
};

function issuePaths(value: unknown) {
	const result = separatedPricingSchema.safeParse(value);
	return result.success ? [] : result.error.issues.map(issue => issue.path.join("."));
}

describe("separated openapi pricing", () => {
	it("accepts a complete set with shares totalling 100", () => {
		expect(issuePaths(valid)).toEqual([]);
	});

	it("requires the wallet discount and keeps it within 0..100", () => {
		expect(issuePaths({ ...valid, walletChargeDiscountPercent: "" })).toEqual(["walletChargeDiscountPercent"]);
		expect(issuePaths({ ...valid, walletChargeDiscountPercent: 101 })).toEqual(["walletChargeDiscountPercent"]);
	});

	it("requires both shares of each receipt register and an exact total of 100", () => {
		expect(issuePaths({ ...valid, connectedKarashabSharePercent: null })).toEqual(["connectedKarashabSharePercent"]);
		expect(issuePaths({ ...valid, disconnectedPartnerSharePercent: 40 })).toEqual(["disconnectedPartnerSharePercent"]);
	});
});
