interface SelectableColumn {
	valueType?: unknown
	hideInSearch?: boolean
	fieldProps?: unknown
}

const SEARCHABLE_SELECT_PROPS = { showSearch: true, optionFilterProp: "label" };

/**
 * ProTable's filter-form selects are plain antd Selects (no typing). Make every `valueType: "select"` filter
 * searchable, like `RHFSelect`; a page can still opt out with `fieldProps.showSearch: false`.
 */
export function withSearchableSelects<T extends SelectableColumn>(columns: T[] | undefined): T[] | undefined {
	return columns?.map((column) => {
		if (column.valueType !== "select" || column.hideInSearch)
			return column;
		const { fieldProps } = column;
		return {
			...column,
			fieldProps: typeof fieldProps === "function"
				? (...args: unknown[]) => ({ ...SEARCHABLE_SELECT_PROPS, ...fieldProps(...args) })
				: { ...SEARCHABLE_SELECT_PROPS, ...(fieldProps as object | undefined) },
		};
	});
}
