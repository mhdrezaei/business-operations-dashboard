import type { SalesAgencyExpenseTitle, SalesAgencyExpenseTitlePayload, SalesAgencyExpenseTitlesResponse } from "../model/sales-agency-expense-title.types";
import { request } from "#src/utils/request";

const BASE = "sales-agency/expense-titles";

export function fetchSalesAgencyExpenseTitles() {
	return request
		.get(`${BASE}/`, { searchParams: { page: 1, page_size: 100 } })
		.json<SalesAgencyExpenseTitlesResponse | SalesAgencyExpenseTitle[]>()
		.then(response => Array.isArray(response) ? response : response.results);
}

export function createSalesAgencyExpenseTitle(payload: SalesAgencyExpenseTitlePayload) {
	return request.post(`${BASE}/`, { json: payload }).json<SalesAgencyExpenseTitle>();
}

export function updateSalesAgencyExpenseTitle(id: number, payload: SalesAgencyExpenseTitlePayload) {
	return request.patch(`${BASE}/${id}/`, { json: payload }).json<SalesAgencyExpenseTitle>();
}
