import { describe, expect, it } from "vitest";
import { sortByStartDesc } from "./contract-order";

describe("contract order", () => {
	it("sorts by start date descending", () => {
		const sorted = sortByStartDesc([
			{ id: 1, start_jy: 1402, start_jm: 5 },
			{ id: 2, start_jy: 1403, start_jm: 1 },
			{ id: 3, start_jy: 1402, start_jm: 9 },
			{ id: 4 },
		]);
		expect(sorted.map(c => c.id)).toEqual([2, 3, 1, 4]);
	});
});
