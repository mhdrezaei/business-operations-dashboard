import type { BankAccountDto, BankAccountFormValues } from "./bank-accounts.types";
import { detectBankNameByCardNumber, normalizeCardNumber, normalizeIban } from "./bank-accounts.constants";

export const emptyBankAccountValues: BankAccountFormValues = {
	bank_name: "",
	account_number: "",
	iban: "",
	card_number: "",
	account_holder_name: "",
};

export function dtoToBankAccountForm(dto: BankAccountDto): BankAccountFormValues {
	const cardNumber = normalizeCardNumber(dto.card_number ?? "");

	return {
		bank_name: dto.bank_name?.trim() || detectBankNameByCardNumber(cardNumber),
		account_number: dto.account_number ?? "",
		iban: normalizeIban(dto.iban ?? ""),
		card_number: cardNumber,
		account_holder_name: dto.account_holder_name ?? "",
	};
}

export function bankAccountFormToPayload(
	values: BankAccountFormValues,
	meta: { serviceId: number, companyId: number },
) {
	const cardNumber = normalizeCardNumber(values.card_number);
	const detectedBankName = detectBankNameByCardNumber(cardNumber);

	return {
		service: meta.serviceId,
		company: meta.companyId,
		bank_name: detectedBankName || values.bank_name.trim(),
		account_number: values.account_number.trim() || "",
		iban: normalizeIban(values.iban),
		card_number: cardNumber,
		account_holder_name: values.account_holder_name.trim(),
	};
}
