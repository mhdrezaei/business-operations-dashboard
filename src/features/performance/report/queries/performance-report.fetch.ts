import type {
	OperatorGovernmentReportQuery,
	PerformanceReportQuery,
} from "#src/features/performance/api/performances.api";
import type { PerformanceReportRow, PerformanceReportSummary } from "../model/performance.report.types";
import {
	fetchOperatorGovernmentReport,
	fetchPerformanceReport,
	fetchPerformanceReportFinanceDepartment,
} from "#src/features/performance/api/performances.api";
import {
	flattenFinanceDepartmentRows,
	getReportTotalsRows,
	normalizeFinanceDepartmentTotals,
	normalizeOperatorGovernmentRow,
	withSequentialIds,
} from "../model/sms-report-variants";

interface PerformanceReportRequest {
	kind: "performance" | "finance"
	query: PerformanceReportQuery
}

interface OperatorGovernmentRequest {
	kind: "operator-government"
	query: OperatorGovernmentReportQuery
}

export type ReportRequest = PerformanceReportRequest | OperatorGovernmentRequest;

export interface ReportPage {
	rows: PerformanceReportRow[]
	count: number
	/** Totals for the summary cards. */
	summary: PerformanceReportSummary
	/** Rows of the "total" line (several for multi-unit traffic and operator-government). */
	totalsRows: PerformanceReportRow[]
}

export async function fetchReportPage(request: ReportRequest): Promise<ReportPage> {
	if (request.kind === "finance") {
		const response = await fetchPerformanceReportFinanceDepartment(request.query);
		const summary = normalizeFinanceDepartmentTotals(response.totals);
		return {
			rows: flattenFinanceDepartmentRows(response.results),
			count: response.count,
			summary,
			totalsRows: getReportTotalsRows(summary),
		};
	}

	if (request.kind === "operator-government") {
		const response = await fetchOperatorGovernmentReport(request.query);
		const periodType = request.query.fiscal_periods ? "fiscal" : "sh";
		const normalize = (row: PerformanceReportRow) => normalizeOperatorGovernmentRow(row, periodType);
		return {
			rows: withSequentialIds(response.results.map(normalize)),
			count: response.count,
			summary: null,
			totalsRows: getReportTotalsRows(response.totals).map(normalize),
		};
	}

	const response = await fetchPerformanceReport(request.query);
	return {
		rows: response.results,
		count: response.count,
		summary: response.totals ?? null,
		totalsRows: getReportTotalsRows(response.totals),
	};
}
