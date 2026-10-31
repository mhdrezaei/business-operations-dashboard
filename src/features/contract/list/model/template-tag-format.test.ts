import { describe, expect, it } from "vitest";
import { formatTagValueHtml } from "./template-tag-format";

describe("formatTagValueHtml", () => {
	it("prefers the backend display text over the raw value", () => {
		expect(formatTagValueHtml("FLAT", { render_mode: "enum", display: "ثابت" })).toBe("ثابت");
	});

	it("falls back to the raw value when there is no meta", () => {
		expect(formatTagValueHtml("a\nb")).toBe("a<br/>b");
	});

	it("renders tiers meta as a table", () => {
		const html = formatTagValueHtml([], {
			render_mode: "tiers",
			columns: [{ key: "min_inclusive", label: "حداقل" }, { key: "rate_per_unit", label: "نرخ" }],
			rows: [{ min_inclusive: "۰", rate_per_unit: "۱۰" }],
		});
		expect(html).toContain("<table");
		expect(html).toContain("حداقل");
		expect(html).not.toContain("object Object");
	});

	it("renders a nested tiers table inside a table cell", () => {
		const html = formatTagValueHtml({}, {
			render_mode: "table",
			columns: [{ key: "title", label: "شرح" }, { key: "amount", label: "مبلغ" }],
			rows: [{ title: "الف", amount: { render_mode: "tiers", columns: [{ key: "rate_per_unit", label: "نرخ" }], rows: [{ rate_per_unit: "۸" }] } }],
		});
		expect(html.match(/<table/g)).toHaveLength(2);
		expect(html).not.toContain("object Object");
	});
});
