import { toNumberOrNull } from "../../shared/utils/value-coercion";

export interface ContractAddendumTreeNode {
	key: string
	id: number | null
	sequenceNumber: number
	displayNumber: string
	parentDisplayNumber: string | null
	contractNumber: string
	startYear: number | null
	startMonth: number | null
	endYear: number | null
	endMonth: number | null
	addendumGroupId: string | null
	children: ContractAddendumTreeNode[]
}

interface CollectedNode {
	key: string
	parentKey: string | null
	order: number
	row: Record<string, unknown>
	children: CollectedNode[]
}

function toText(value: unknown) {
	return value === null || value === undefined ? "" : String(value);
}

function collapseComponentRows(addenda: unknown): Array<Record<string, unknown>> {
	const rows = Array.isArray(addenda)
		? addenda.map(item => (item ?? {}) as Record<string, unknown>)
		: [];

	if (!rows.some(row => typeof row.component === "string")) {
		return rows.map(row => ({
			...row,
			children: collapseComponentRows(row.children),
		}));
	}

	const groups = new Map<string, Record<string, unknown>[]>();
	for (const row of rows) {
		const groupKey = toText(
			row.display_addendum_number
			?? row.displayAddendumNumber
			?? `${row.parent_addendum_id ?? row.parentAddendumId ?? "root"}-${row.start_jy ?? row.startYear}-${row.start_jm ?? row.startMonth}-${row.end_jy ?? row.endYear}-${row.end_jm ?? row.endMonth}-${row.contract_number ?? row.contractNumber ?? ""}`,
		);
		groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
	}

	return [...groups.values()].map((group) => {
		const first = group[0];
		return {
			...first,
			children: collapseComponentRows(group.flatMap(row => Array.isArray(row.children) ? row.children : [])),
		};
	});
}

/**
 * Contract detail APIs may return addenda as a nested tree, a flat list with a
 * parent id, or a mixture of both. This creates one consistent recursive tree.
 */
export function buildContractAddendaTree(addenda: unknown): ContractAddendumTreeNode[] {
	const nodes = new Map<string, CollectedNode>();
	let anonymousId = 0;
	let order = 0;

	const collect = (items: unknown, inferredParentKey: string | null = null) => {
		if (!Array.isArray(items))
			return;

		for (const item of items) {
			const row = (item ?? {}) as Record<string, unknown>;
			const id = toNumberOrNull(row.id);
			const key = id === null ? `anonymous:${anonymousId++}` : `id:${id}`;
			const parentId = toNumberOrNull(row.parent_addendum_id ?? row.parentAddendumId);
			const parentKey = parentId === null ? inferredParentKey : `id:${parentId}`;
			const existing = nodes.get(key);
			const node = existing ?? {
				key,
				parentKey,
				order: order++,
				row: {},
				children: [],
			};

			node.parentKey ??= parentKey;
			node.row = { ...node.row, ...row };
			nodes.set(key, node);
			collect(row.children, key);
		}
	};

	collect(collapseComponentRows(addenda));

	const roots: CollectedNode[] = [];
	for (const node of nodes.values()) {
		const parent = node.parentKey ? nodes.get(node.parentKey) : undefined;
		if (parent && parent.key !== node.key)
			parent.children.push(node);
		else
			roots.push(node);
	}

	const collator = new Intl.Collator("fa", { numeric: true, sensitivity: "base" });
	const explicitNumber = (node: CollectedNode) => toText(
		node.row.display_addendum_number ?? node.row.displayAddendumNumber,
	);
	const sortNodes = (items: CollectedNode[]) => {
		items.sort((left, right) => {
			const leftNumber = explicitNumber(left);
			const rightNumber = explicitNumber(right);
			if (leftNumber && rightNumber)
				return collator.compare(leftNumber, rightNumber);
			return left.order - right.order;
		});
		items.forEach(item => sortNodes(item.children));
	};
	sortNodes(roots);

	const mapNodes = (
		items: CollectedNode[],
		parentDisplayNumber: string | null = null,
	): ContractAddendumTreeNode[] => items.map((node, index) => {
		const row = node.row;
		const generatedNumber = parentDisplayNumber
			? `${parentDisplayNumber}.${index + 1}`
			: String(index + 1);
		const displayNumber = explicitNumber(node) || generatedNumber;

		return {
			key: node.key,
			id: toNumberOrNull(row.id),
			sequenceNumber: index + 1,
			displayNumber,
			parentDisplayNumber,
			contractNumber: toText(row.contract_number ?? row.contractNumber),
			startYear: toNumberOrNull(row.start_jy ?? row.startYear),
			startMonth: toNumberOrNull(row.start_jm ?? row.startMonth),
			endYear: toNumberOrNull(row.end_jy ?? row.endYear),
			endMonth: toNumberOrNull(row.end_jm ?? row.endMonth),
			addendumGroupId: typeof row.addendum_group_id === "string" ? row.addendum_group_id : (typeof row.addendumGroupId === "string" ? row.addendumGroupId : null),
			children: mapNodes(node.children, displayNumber),
		};
	});

	return mapNodes(roots);
}
