export interface Paginated<T> {
	count: number
	next: string | null
	previous: string | null
	results: T[]
}

export interface BankAccountDto {
	id: number
	company: number
	bank_name: string
	account_number: string
	iban: string
	card_number: string
	account_holder_name: string
	created_at: string
	updated_at: string
}

export interface BankAccountFormValues {
	bank_name: string
	account_number: string
	iban: string
	card_number: string
	account_holder_name: string
}
