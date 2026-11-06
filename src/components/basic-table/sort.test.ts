import { describe, expect, it } from "vitest";
import { sortToOrdering, withServerSorting } from "./sort";

describe("sortToOrdering", () => {
	it("joins multi-column sort in order with descending prefix", () => {
		expect(sortToOrdering({ company_name: "ascend", start_date: "descend" })).toBe("company_name,-start_date");
	});

	it("applies backend aliases and ignores cleared columns", () => {
		expect(sortToOrdering({ end_date: "descend", id: null }, { end_date: "end_date_exclusive" })).toBe("-end_date_exclusive");
	});

	it("returns undefined when nothing is sorted", () => {
		expect(sortToOrdering(undefined)).toBeUndefined();
		expect(sortToOrdering({})).toBeUndefined();
	});
});

describe("withServerSorting", () => {
	it("adds the marker column only for request tables with object sorters", () => {
		const columns = [{ dataIndex: "a", sorter: { multiple: 1 } }];
		expect(withServerSorting(columns, true)).toHaveLength(2);
		expect(withServerSorting(columns, false)).toBe(columns);
		expect(withServerSorting([{ dataIndex: "a", sorter: { compare: () => 0 } }], true)).toHaveLength(1);
		expect(withServerSorting([{ dataIndex: "a" }], true)).toHaveLength(1);
	});
});
