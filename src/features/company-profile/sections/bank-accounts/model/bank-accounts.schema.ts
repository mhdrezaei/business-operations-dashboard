import { z } from "zod";

export const bankAccountSchema = z.object({
	bank_name: z.string().trim().min(1, "نام بانک الزامی است"),
	account_holder_name: z.string().trim().min(1, "نام صاحب حساب الزامی است"),

	account_number: z.string().trim(),
	iban: z.string().trim(),
	card_number: z.string().trim(),
});
