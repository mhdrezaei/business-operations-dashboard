import type { ProColumns } from "@ant-design/pro-components";
import type { ReactNode } from "react";
import type { PerformanceReportRow } from "../../model/performance.report.types";
import { Table, theme } from "antd";
import { getReportTotalsRowLabel } from "../../model/sms-report-variants";

interface ReportTotalsSummaryProps {
	columns: ProColumns<PerformanceReportRow>[]
	rows: PerformanceReportRow[]
	label: string
}

const LABEL_COLUMN_KEYS = ["company_name", "operation_type"];

/** "Total" line(s) under the last page of the report, one cell per visible table column. */
export function ReportTotalsSummary({ columns, rows, label }: ReportTotalsSummaryProps) {
	const { token } = theme.useToken();
	const tableColumns = columns.filter(column => !column.hideInTable);
	const isFillerColumn = (column: ProColumns<PerformanceReportRow>) => column.valueType === "indexBorder" || column.valueType === "option";
	const labelIndex = Math.max(
		tableColumns.findIndex(column => LABEL_COLUMN_KEYS.includes(String(column.dataIndex))),
		tableColumns.findIndex(column => !isFillerColumn(column)),
	);

	return (
		<Table.Summary fixed>
			{rows.map((row, rowIndex) => (
				<Table.Summary.Row key={String(row.id ?? rowIndex)} style={{ background: token.colorFillAlter, fontWeight: token.fontWeightStrong }}>
					{tableColumns.map((column, index) => (
						<Table.Summary.Cell key={String(column.key ?? column.dataIndex ?? index)} index={index}>
							{index === labelIndex
								? getReportTotalsRowLabel(label, row)
								: isFillerColumn(column)
									? null
									// The column renderers only read the row; the remaining ProTable arguments are unused.
									: ((column.render?.(null, row, rowIndex, undefined as never, column as never) as ReactNode) ?? "-")}
						</Table.Summary.Cell>
					))}
				</Table.Summary.Row>
			))}
		</Table.Summary>
	);
}
