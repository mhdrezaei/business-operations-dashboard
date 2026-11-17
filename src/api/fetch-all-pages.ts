import type { Paginated } from "./types";

/**
 * Reads every page of a paginated endpoint and returns them as one page.
 * `page_size` is capped (or ignored) by the backend, so a single request can silently drop rows.
 * A plain-array response is passed through unchanged.
 */
export async function fetchAllPages<T>(
	fetchPage: (page: number) => Promise<Paginated<T> | T[]>,
): Promise<Paginated<T>> {
	const results: T[] = [];
	for (let page = 1; ; page += 1) {
		const response = await fetchPage(page);
		if (Array.isArray(response))
			return { count: response.length, next: null, previous: null, results: response };
		results.push(...response.results);
		if (!response.next)
			return { count: results.length, next: null, previous: null, results };
	}
}
