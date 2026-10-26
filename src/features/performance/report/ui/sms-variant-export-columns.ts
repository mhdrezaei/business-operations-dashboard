import type { FinanceRowTypeLabels } from "../model/sms-report-variants";
import type { SmsReportType } from "./constants";
import type { ReportExportColumn } from "./export";
import { formatFinanceRowType } from "../model/sms-report-variants";

interface SmsVariantExportArgs {
	variant: SmsReportType
	countTitle: string
	serviceNameTitle: string
	serviceNameFallback: string | null
	rowTypeTitle: string
	rowTypeLabels: FinanceRowTypeLabels
	getOperatorLabel: (operator: unknown) => string
	getLanguageLabel: (language: unknown) => string
}

/** Adds what the plain SMS export lacks: the row type of the finance report and the service of the mixed reports. */
export function addSmsVariantExportColumns(columns: ReportExportColumn[], args: SmsVariantExportArgs): ReportExportColumn[] {
	if (args.variant === "finance") {
		const countIndex = columns.findIndex(column => column.title === args.countTitle);
		const rowTypeColumn: ReportExportColumn = {
			title: args.rowTypeTitle,
			getValue: row => formatFinanceRowType(row, args.rowTypeLabels, args.getOperatorLabel, args.getLanguageLabel),
		};
		return countIndex < 0 ? [...columns, rowTypeColumn] : columns.toSpliced(countIndex, 0, rowTypeColumn);
	}

	if (args.variant === "summary" || args.variant === "operatorGovernment") {
		return [
			{ title: args.serviceNameTitle, getValue: row => String(row.service_name ?? "").trim() || args.serviceNameFallback || "-" },
			...columns,
		];
	}

	return columns;
}
