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

interface SortableColumn {
	dataIndex?: unknown
	sorter?: unknown
}

const SERVER_SORT_MARKER_COLUMN = { dataIndex: "__server_sort__", hideInTable: true, search: false, sorter: true };

function isServerSorter(sorter: unknown) {
	return typeof sorter === "object" && sorter !== null && !("compare" in sorter);
}

/**
 * ProTable only forwards `sort` to `request` when a column has `sorter === true`; the `{ multiple: n }`
 * sorters the pages use to keep multi-column order are otherwise sorted locally (header toggles, no request).
 * A hidden `sorter: true` column flips ProTable to server sorting without touching the visible columns.
 */
export function withServerSorting<T extends SortableColumn>(columns: T[] | undefined, hasRequest: boolean): T[] | undefined {
	if (!hasRequest || !columns?.some(column => isServerSorter(column.sorter)) || columns.some(column => column.sorter === true))
		return columns;
	return [...columns, SERVER_SORT_MARKER_COLUMN as unknown as T];
}
