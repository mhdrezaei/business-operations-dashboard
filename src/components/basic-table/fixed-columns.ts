interface PinnableColumn {
	fixed?: boolean | "left" | "right" | "start" | "end"
	hideInTable?: boolean
}

/**
 * rc-table (7.54) pins columns to the *physical* side in RTL, so a trailing `fixed: "right"` column
 * (the visual end, e.g. the actions column) never sticks. Pin by position instead: pinned columns
 * before the first scrolling column stick to the visual start (physical right), pinned columns after
 * the last scrolling column stick to the visual end (physical left).
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
		return { ...column, fixed: visible.indexOf(column) < firstScrolling ? "right" : "left" };
	});
}
