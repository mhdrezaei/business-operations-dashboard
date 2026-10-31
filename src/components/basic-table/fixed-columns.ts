interface PinnableColumn {
	fixed?: boolean | "left" | "right" | "start" | "end"
	hideInTable?: boolean
}

/**
 * antd/rc-table order and swap `fixed` logically in RTL: `left` columns move to the visual start (physical right)
 * and `right` columns to the visual end (physical left). Pin by position so a trailing actions column
 * always lands on the visual end, whichever side the page declared: pinned columns before the first
 * scrolling column → `left` (visual start), pinned columns after the last scrolling column → `right` (visual end).
 */
export function normalizeFixedColumns<T extends PinnableColumn>(columns: T[] | undefined, isRtl: boolean): T[] | undefined {
	if (!isRtl || !columns)
		return columns;

	const visible = columns.filter(column => !column.hideInTable);
	const firstScrolling = visible.findIndex(column => !column.fixed);
	if (firstScrolling < 0)
		return columns;

	return columns.map((column) => {
		if (!column.fixed || column.hideInTable)
			return column;
		return { ...column, fixed: visible.indexOf(column) < firstScrolling ? "left" : "right" };
	});
}
