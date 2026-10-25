import type { BankAccountDto, BankAccountFormValues } from "./bank-accounts.types";
import { normalizeCardNumber, normalizeIban } from "./bank-accounts.constants";

export const emptyBankAccountValues: BankAccountFormValues = {
	bank_name: "",
	account_number: "",
	iban: "",
	card_number: "",
	account_holder_name: "",
};

export function dtoToBankAccountForm(dto: BankAccountDto): BankAccountFormValues {
	return {
		bank_name: dto.bank_name?.trim() ?? "",
		account_number: dto.account_number ?? "",
		iban: normalizeIban(dto.iban ?? ""),
		card_number: normalizeCardNumber(dto.card_number ?? ""),
		account_holder_name: dto.account_holder_name ?? "",
	};
}

export function bankAccountFormToPayload(
	values: BankAccountFormValues,
	meta: { serviceId: number, companyId: number, contractOrder?: number | null },
) {
	return {
		service: meta.serviceId,
		company: meta.companyId,
		bank_name: values.bank_name.trim(),
		account_number: values.account_number.trim() || "",
		iban: normalizeIban(values.iban),
		card_number: normalizeCardNumber(values.card_number),
		account_holder_name: values.account_holder_name.trim(),
		contract_order: meta.contractOrder ?? null,
	};
}

export function bankAccountDtoToPayload(dto: BankAccountDto, serviceId: number, contractOrder: number | null) {
	return {
		service: serviceId,
		company: dto.company,
		bank_name: dto.bank_name,
		account_number: dto.account_number || "",
		iban: dto.iban || "",
		card_number: dto.card_number || "",
		account_holder_name: dto.account_holder_name,
		contract_order: contractOrder,
	};
}
