import { describe, expect, it } from "vitest";
import { normalizeFixedColumns } from "./fixed-columns";

describe("normalizeFixedColumns", () => {
	const columns = [
		{ key: "index", fixed: "left" as const },
		{ key: "name" },
		{ key: "hidden", hideInTable: true },
		{ key: "actions", fixed: "right" as const },
	];

	it("keeps columns untouched in LTR", () => {
		expect(normalizeFixedColumns(columns, false)).toBe(columns);
	});

	it("pins by position in RTL: leading → visual start (left), trailing → visual end (right)", () => {
		const result = normalizeFixedColumns(columns, true)!;
		expect(result.map(column => column.fixed)).toEqual(["left", undefined, undefined, "right"]);
	});

	it("does not touch tables with only pinned columns", () => {
		const onlyFixed = [{ key: "a", fixed: "right" as const }];
		expect(normalizeFixedColumns(onlyFixed, true)).toBe(onlyFixed);
	});
});
