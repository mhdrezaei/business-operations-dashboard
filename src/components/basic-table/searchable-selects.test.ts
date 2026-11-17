import { describe, expect, it } from "vitest";
import { withSearchableSelects } from "./searchable-selects";

describe("withSearchableSelects", () => {
	it("adds search to select filters and keeps the page's own fieldProps", () => {
		const [column] = withSearchableSelects([{ valueType: "select", fieldProps: { allowClear: true } }])!;
		expect(column.fieldProps).toEqual({ showSearch: true, optionFilterProp: "label", allowClear: true });
	});

	it("lets a page opt out and supports function fieldProps", () => {
		const [off, fn] = withSearchableSelects([
			{ valueType: "select", fieldProps: { showSearch: false } },
			{ valueType: "select", fieldProps: () => ({ disabled: true }) },
		])!;
		expect((off.fieldProps as { showSearch: boolean }).showSearch).toBe(false);
		expect((fn.fieldProps as () => object)()).toEqual({ showSearch: true, optionFilterProp: "label", disabled: true });
	});

	it("leaves other columns untouched", () => {
		const columns = [{ valueType: "text" }];
		expect(withSearchableSelects(columns)![0]).toBe(columns[0]);
	});
});
