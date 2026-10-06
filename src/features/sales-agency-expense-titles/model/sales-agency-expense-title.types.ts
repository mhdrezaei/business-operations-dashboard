export interface SalesAgencyExpenseTitle {
	id: number
	name: string
	is_active: boolean
}

export interface SalesAgencyExpenseTitlePayload {
	name: string
	is_active: boolean
}

export interface SalesAgencyExpenseTitlesResponse {
	count: number
	next: string | null
	previous: string | null
	results: SalesAgencyExpenseTitle[]
}
