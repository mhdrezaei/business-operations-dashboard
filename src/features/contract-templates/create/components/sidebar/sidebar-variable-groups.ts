import { GROUP_LABELS } from "../editor/variables/registry";

export function buildDisplayBlocks(variables: any[]) {
	const blocks: any[] = [];
	const familyBlockIndex = new Map();
	let currentSingles: any = null;

	for (const variable of variables) {
		// Slot families come from the backend (`constraints.slot`); a number inside a key (e.g. `openapi_legacy_2_...`) is not a slot.
		if (variable.slot == null) {
			if (!currentSingles) {
				currentSingles = { type: "singles", variables: [] };
				blocks.push(currentSingles);
			}
			currentSingles.variables.push(variable);
			continue;
		}
		currentSingles = null;
		const index = Number(variable.slot);
		const prefix = variable.key.replace(new RegExp(`_${index}_.+$`), "");
		if (!familyBlockIndex.has(prefix)) {
			familyBlockIndex.set(prefix, blocks.length);
			blocks.push({ type: "family", prefix, maxIndex: 0, variablesByIndex: new Map() });
		}
		const block = blocks[familyBlockIndex.get(prefix)];
		if (!block.variablesByIndex.has(index))
			block.variablesByIndex.set(index, []);
		block.variablesByIndex.get(index).push(variable);
		block.maxIndex = Math.max(block.maxIndex, index);
	}
	return blocks;
}

/**
 * Turns the backend variable catalog into sidebar groups.
 * Tag keys are the backend catalog keys; only `contract`/`addendum` children get the prefix the editor has always used.
 */
export function buildCatalogGroups(catalogVariables: any[]) {
	const toVariable = (rootKey: string, node: any) => {
		let finalKey = node.key;

		// Guarantee tags are named exactly as the backend catalog key; prefixing them makes the backend report them as unknown.
		const isPrefixed = (rootKey === "contract" || rootKey === "addendum") && !node.constraints?.guarantee_tag;
		if (isPrefixed && !finalKey.startsWith(rootKey)) {
			finalKey = `${rootKey}_${finalKey}`;
		}

		return {
			key: finalKey,
			label: node.label,
			example: node.example,
			slot: node.constraints?.slot,
		};
	};

	const groups: any[] = [];
	// Childless roots (the financial tags) would each become their own one-chip collapse: gather them per category.
	const flatGroups = new Map<string, any>();

	for (const root of catalogVariables.filter((node: any) => node.key !== "service")) {
		if (Array.isArray(root.children) && root.children.length > 0) {
			groups.push({ group: root.key, label: root.label, variables: root.children.map((child: any) => toVariable(root.key, child)) });
			continue;
		}
		let flatGroup = flatGroups.get(root.category);
		if (!flatGroup) {
			flatGroup = { group: `flat_${root.category}`, label: GROUP_LABELS[root.category as keyof typeof GROUP_LABELS] ?? root.label, variables: [] };
			flatGroups.set(root.category, flatGroup);
			groups.push(flatGroup);
		}
		flatGroup.variables.push(toVariable(root.key, root));
	}

	return groups;
}
