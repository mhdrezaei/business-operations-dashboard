import { describe, expect, it } from "vitest";
import { buildCatalogGroups, buildDisplayBlocks } from "./sidebar-variable-groups";

describe("buildCatalogGroups", () => {
	it("prefixes contract and addendum children but not guarantee tags", () => {
		const groups = buildCatalogGroups([
			{
				key: "contract",
				label: "قرارداد",
				children: [
					{ key: "number", label: "شماره" },
					{ key: "contract_title", label: "عنوان" },
					{ key: "guarantee_check_text", label: "چک", constraints: { guarantee_tag: true } },
				],
			},
			{ key: "company", label: "شرکت", children: [{ key: "name", label: "نام" }] },
		]);

		expect(groups.map(g => g.group)).toEqual(["contract", "company"]);
		expect(groups[0].variables.map((v: any) => v.key)).toEqual([
			"contract_number",
			"contract_title",
			"guarantee_check_text",
		]);
		expect(groups[1].variables[0].key).toBe("name");
	});

	it("drops the service root and gathers childless roots into one group per category", () => {
		const groups = buildCatalogGroups([
			{ key: "service", label: "سرویس", children: [{ key: "x", label: "x" }] },
			{ key: "fin_a", label: "الف", category: "financial" },
			{ key: "fin_b", label: "ب", category: "financial", children: [] },
			{ key: "start", label: "شروع", category: "date" },
		]);

		expect(groups.map(g => [g.group, g.label])).toEqual([
			["flat_financial", "اطلاعات مالی"],
			["flat_date", "تاریخ"],
		]);
		expect(groups[0].variables.map((v: any) => v.key)).toEqual(["fin_a", "fin_b"]);
	});

	it("falls back to the root label for unknown categories and keeps the backend slot", () => {
		const groups = buildCatalogGroups([
			{ key: "odd", label: "عجیب", category: "unmapped", constraints: { slot: 2 } },
		]);

		expect(groups[0].label).toBe("عجیب");
		expect(groups[0].variables[0].slot).toBe(2);
	});
});

describe("buildDisplayBlocks", () => {
	it("keeps variables without a backend slot as singles, even when the key contains a number", () => {
		const blocks = buildDisplayBlocks([
			{ key: "openapi_legacy_2_price", label: "قیمت" },
			{ key: "plain", label: "ساده" },
		]);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].type).toBe("singles");
		expect(blocks[0].variables).toHaveLength(2);
	});

	it("groups slot variables into one family per prefix and tracks the highest slot", () => {
		const blocks = buildDisplayBlocks([
			{ key: "plain", label: "ساده" },
			{ key: "tier_1_from", label: "از", slot: 1 },
			{ key: "tier_1_to", label: "تا", slot: 1 },
			{ key: "tier_3_from", label: "از", slot: 3 },
			{ key: "after", label: "بعد" },
		]);

		expect(blocks.map((b: any) => b.type)).toEqual(["singles", "family", "singles"]);
		const family = blocks[1];
		expect(family.prefix).toBe("tier");
		expect(family.maxIndex).toBe(3);
		expect(family.variablesByIndex.get(1).map((v: any) => v.key)).toEqual(["tier_1_from", "tier_1_to"]);
		expect(family.variablesByIndex.get(3)).toHaveLength(1);
	});
});
