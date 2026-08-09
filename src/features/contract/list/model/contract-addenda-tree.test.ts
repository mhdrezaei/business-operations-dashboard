import { describe, expect, it } from "vitest";
import { buildContractAddendaTree } from "./contract-addenda-tree";

describe("buildContractAddendaTree", () => {
	it("preserves recursive children returned by the API", () => {
		const tree = buildContractAddendaTree([
			{
				id: 10,
				display_addendum_number: "1",
				children: [{ id: 11, display_addendum_number: "1.1", start_jy: 1405 }],
			},
		]);

		expect(tree).toHaveLength(1);
		expect(tree[0].children[0]).toMatchObject({
			id: 11,
			sequenceNumber: 1,
			displayNumber: "1.1",
			parentDisplayNumber: "1",
			startYear: 1405,
		});
	});

	it("connects flat addenda by parent_addendum_id", () => {
		const tree = buildContractAddendaTree([
			{ id: 2, parent_addendum_id: 1, display_addendum_number: "1.1" },
			{ id: 1, display_addendum_number: "1" },
		]);

		expect(tree.map(item => item.id)).toEqual([1]);
		expect(tree[0].children.map(item => item.id)).toEqual([2]);
	});

	it("generates hierarchical numbers when the API omits display numbers", () => {
		const tree = buildContractAddendaTree([
			{ id: 1, children: [{ id: 2 }] },
		]);

		expect(tree[0].displayNumber).toBe("1");
		expect(tree[0].children[0].displayNumber).toBe("1.1");
	});

	it("does not duplicate a node returned in both nested and flat forms", () => {
		const tree = buildContractAddendaTree([
			{ id: 1, children: [{ id: 2, display_addendum_number: "1.1" }] },
			{ id: 2, parent_addendum_id: 1, contract_number: "ADD-2" },
		]);

		expect(tree[0].children).toHaveLength(1);
		expect(tree[0].children[0].contractNumber).toBe("ADD-2");
	});

	it("shows SMS component rows as one logical addendum", () => {
		const tree = buildContractAddendaTree([
			{ id: 21, component: "OPERATOR", display_addendum_number: "1", contract_number: "SMS-1" },
			{ id: 22, component: "GOVERNMENT", display_addendum_number: "1", contract_number: "SMS-1" },
			{ id: 23, component: "PROFIT", display_addendum_number: "1", contract_number: "SMS-1" },
		]);

		expect(tree).toHaveLength(1);
		expect(tree[0]).toMatchObject({ displayNumber: "1", contractNumber: "SMS-1" });
	});
});
