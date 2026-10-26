import { emptyFinanceProfileValues } from "./company-finance.mappers";
import { financeProfileSchema } from "./company-finance.schema";

describe("finance profile schema", () => {
	it("accepts backend settlement terms and rejects UNKNOWN vat", () => {
		expect(financeProfileSchema.safeParse({ ...emptyFinanceProfileValues, settlement_term: "PERIODIC" }).success).toBe(true);
		expect(financeProfileSchema.safeParse({ ...emptyFinanceProfileValues, vat_status: "UNKNOWN" }).success).toBe(false);
	});

	it("validates the commitment cap as a number", () => {
		expect(financeProfileSchema.safeParse({ ...emptyFinanceProfileValues, financial_commitment_cap: "1500" }).success).toBe(true);
		expect(financeProfileSchema.safeParse({ ...emptyFinanceProfileValues, financial_commitment_cap: "abc" }).success).toBe(false);
	});
});
