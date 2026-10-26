import type { SalesAgencyExpenseTitle, SalesAgencyExpenseTitlePayload, SalesAgencyExpenseTitlesResponse } from "../model/sales-agency-expense-title.types";
import { request } from "#src/utils/request";

const BASE = "contracts/sales-agency/expense-titles";

/** Every title, following the pagination (the list is not limited to the first page). */
export async function fetchSalesAgencyExpenseTitles() {
	const titles: SalesAgencyExpenseTitle[] = [];
	for (let page = 1, hasNext = true; hasNext; page += 1) {
		const response = await request.get(`${BASE}/`, { searchParams: { page } }).json<SalesAgencyExpenseTitlesResponse>();
		titles.push(...response.results);
		hasNext = Boolean(response.next);
	}
	return titles;
}

export function createSalesAgencyExpenseTitle(payload: SalesAgencyExpenseTitlePayload) {
	return request.post(`${BASE}/`, { json: payload }).json<SalesAgencyExpenseTitle>();
}

export function updateSalesAgencyExpenseTitle(id: number, payload: SalesAgencyExpenseTitlePayload) {
	return request.put(`${BASE}/${id}/`, { json: payload }).json<SalesAgencyExpenseTitle>();
}
