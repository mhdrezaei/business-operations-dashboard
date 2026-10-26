import { bankAccountFormToPayload } from "./bank-accounts.mappers";
import { bankAccountSchema } from "./bank-accounts.schema";

const base = { bank_name: "ملت", account_holder_name: "شرکت", account_number: "", iban: "", card_number: "" };

describe("bank account schema", () => {
	it("requires at least one of account number, IBAN or card", () => {
		expect(bankAccountSchema.safeParse(base).success).toBe(false);
		expect(bankAccountSchema.safeParse({ ...base, account_number: "123" }).success).toBe(true);
		expect(bankAccountSchema.safeParse({ ...base, iban: "IR120000000000000000000000" }).success).toBe(true);
		expect(bankAccountSchema.safeParse({ ...base, card_number: "6104337012345678" }).success).toBe(true);
	});

	it("requires bank name and holder name", () => {
		expect(bankAccountSchema.safeParse({ ...base, account_number: "1", bank_name: " " }).success).toBe(false);
		expect(bankAccountSchema.safeParse({ ...base, account_number: "1", account_holder_name: "" }).success).toBe(false);
	});

	it("keeps the typed bank name instead of deriving it from the card BIN", () => {
		const payload = bankAccountFormToPayload({ ...base, card_number: "6037997012345678" }, { serviceId: 1, companyId: 2 });
		expect(payload.bank_name).toBe("ملت");
	});
});

describe("bank account format rules", () => {
	it("validates card length and IBAN format when present", () => {
		expect(bankAccountSchema.safeParse({ ...base, card_number: "6104" }).success).toBe(false);
		expect(bankAccountSchema.safeParse({ ...base, iban: "IR12" }).success).toBe(false);
		expect(bankAccountSchema.safeParse({ ...base, iban: "IR120000000000000000000000" }).success).toBe(true);
	});
});
