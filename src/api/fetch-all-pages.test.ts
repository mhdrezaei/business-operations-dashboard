import type { Paginated } from "./types";
import { describe, expect, it } from "vitest";
import { fetchAllPages } from "./fetch-all-pages";

function page(results: number[], hasNext: boolean): Paginated<number> {
	return { count: 99, next: hasNext ? "next" : null, previous: null, results };
}

describe("fetchAllPages", () => {
	it("follows next until the last page and merges results", async () => {
		const pages = [page([1, 2], true), page([3, 4], true), page([5], false)];
		const requested: number[] = [];

		const result = await fetchAllPages((pageNumber) => {
			requested.push(pageNumber);
			return Promise.resolve(pages[pageNumber - 1]);
		});

		expect(requested).toEqual([1, 2, 3]);
		expect(result.results).toEqual([1, 2, 3, 4, 5]);
		expect(result.count).toBe(5);
		expect(result.next).toBeNull();
	});

	it("passes a plain array through", async () => {
		const result = await fetchAllPages(() => Promise.resolve([7, 8]));

		expect(result.results).toEqual([7, 8]);
		expect(result.count).toBe(2);
	});
});
