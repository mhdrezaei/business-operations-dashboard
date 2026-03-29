import type {
	PerformanceReportListItem,
	PerformanceReportQuery,
	PerformanceReportTotals,
} from "#src/features/performance/api/performances.api";

export type PerformanceReportRow = PerformanceReportListItem;
export type PerformanceReportRequest = PerformanceReportQuery;
export type PerformanceReportSummary = PerformanceReportTotals | null;
