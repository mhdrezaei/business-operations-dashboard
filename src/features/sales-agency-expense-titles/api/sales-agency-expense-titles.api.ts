import type { SalesAgencyExpenseTitle, SalesAgencyExpenseTitlePayload, SalesAgencyExpenseTitlesResponse } from "../model/sales-agency-expense-title.types";
import { fetchAllPages } from "#src/api/fetch-all-pages";
import { request } from "#src/utils/request";

const BASE = "contracts/sales-agency/expense-titles";

/** Every title, following the pagination (the list is not limited to the first page). */
export async function fetchSalesAgencyExpenseTitles() {
	const { results } = await fetchAllPages(page => request
		.get(`${BASE}/`, { searchParams: { page } })
		.json<SalesAgencyExpenseTitlesResponse>());
	return results;
}

export function createSalesAgencyExpenseTitle(payload: SalesAgencyExpenseTitlePayload) {
	return request.post(`${BASE}/`, { json: payload }).json<SalesAgencyExpenseTitle>();
}

export function updateSalesAgencyExpenseTitle(id: number, payload: SalesAgencyExpenseTitlePayload) {
	return request.put(`${BASE}/${id}/`, { json: payload }).json<SalesAgencyExpenseTitle>();
}
