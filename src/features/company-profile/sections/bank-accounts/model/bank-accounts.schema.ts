import { z } from "zod";
import {
	BANK_CARD_NUMBER_LENGTH,
	BANK_IBAN_DIGITS_LENGTH,
} from "./bank-accounts.constants";

export const bankAccountSchema = z.object({
	bank_name: z.string().trim().min(1, "نام بانک از روی شماره کارت شناسایی نشد"),
	account_holder_name: z.string().trim().min(1, "نام صاحب حساب الزامی است"),
	account_number: z.string().trim(),
	iban: z.string().trim().refine(
		value => !value || new RegExp(`^IR\\d{${BANK_IBAN_DIGITS_LENGTH}}$`).test(value.toUpperCase()),
		`شماره شبا باید با IR و ${BANK_IBAN_DIGITS_LENGTH} رقم وارد شود`,
	),
	card_number: z.string().trim().length(BANK_CARD_NUMBER_LENGTH, `شماره کارت باید ${BANK_CARD_NUMBER_LENGTH} رقم باشد`),
});
