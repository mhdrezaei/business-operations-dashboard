import type { BankAccountDto, Paginated } from "../sections/bank-accounts/model/bank-accounts.types";
import { request } from "#src/utils/request/";

export interface ListBankAccountsParams {
	company: number
	page?: number
	search?: string
	ordering?: string
	bank_name?: string
}

function toSearchParams(params: ListBankAccountsParams): Record<string, string | number | boolean | undefined> {
	return {
		company: params.company,
		page: params.page,
		search: params.search,
		ordering: params.ordering,
		bank_name: params.bank_name,
	};
}

export async function listBankAccounts(params: ListBankAccountsParams) {
	return request
		.get("contracts/company/bank-accounts/", { searchParams: toSearchParams(params) })
		.json<Paginated<BankAccountDto>>();
}

export async function createBankAccount(payload: {
	service: number
	company: number
	bank_name: string
	account_number: string
	iban: string
	card_number: string
	account_holder_name: string
}) {
	return request
		.post("contracts/company/bank-accounts/", { json: payload })
		.json<BankAccountDto>();
}

export async function updateBankAccount(
	id: number,
	payload: {
		service: number
		company: number
		bank_name: string
		account_number: string
		iban: string
		card_number: string
		account_holder_name: string
	},
) {
	return request
		.put(`contracts/company/bank-accounts/${id}/`, { json: payload })
		.json<BankAccountDto>();
}

export async function deleteBankAccount(id: number) {
	await request.delete(`contracts/company/bank-accounts/${id}/`).json();
}
