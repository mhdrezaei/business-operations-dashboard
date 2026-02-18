import type { BankAccountDto, BankAccountFormValues } from "./bank-accounts.types";

export const emptyBankAccountValues: BankAccountFormValues = {
	bank_name: "",
	account_number: "",
	iban: "",
	card_number: "",
	account_holder_name: "",
};

export function dtoToBankAccountForm(dto: BankAccountDto): BankAccountFormValues {
	return {
		bank_name: dto.bank_name ?? "",
		account_number: dto.account_number ?? "",
		iban: dto.iban ?? "",
		card_number: dto.card_number ?? "",
		account_holder_name: dto.account_holder_name ?? "",
	};
}

export function bankAccountFormToPayload(
	values: BankAccountFormValues,
	meta: { serviceId: number, companyId: number },
) {
	return {
		service: meta.serviceId,
		company: meta.companyId,
		bank_name: values.bank_name.trim(),
		account_number: values.account_number.trim() || "",
		iban: values.iban.trim() || "",
		card_number: values.card_number.trim() || "",
		account_holder_name: values.account_holder_name.trim(),
	};
}
