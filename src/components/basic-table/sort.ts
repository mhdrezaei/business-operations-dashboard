import type { SortOrder } from "antd/es/table/interface";

/**
 * ProTable's `request(params, sort)` sort object → DRF `ordering` value
 * (`"a,-b"`, in click order). `aliases` maps a column's dataIndex to the backend field.
 */
export function sortToOrdering(
	sort: Record<string, SortOrder> | undefined,
	aliases: Record<string, string> = {},
): string | undefined {
	const fields = Object.entries(sort ?? {})
		.filter(([, order]) => order)
		.map(([field, order]) => `${order === "descend" ? "-" : ""}${aliases[field] ?? field}`);
	return fields.length > 0 ? fields.join(",") : undefined;
}
