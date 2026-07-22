import type { PerformanceReportListItem, PerformanceReportTotals } from "#src/features/performance/api/performances.api";
import type { PeriodType, ReportAuditColumnKey, TrafficReportLayout } from "./constants";
import { formatReportDatacenterName, formatReportUserRef, getReportMonthLabel, getReportYearValue, REPORT_FIELD_KEYS } from "./constants";

export type ReportFinancialColumnKey
	= | "income" | "expense" | "profit" | "total" | "contractType" | "showBaseUnit" | "rial" | "unitPrice" | "karashabIncome" | "karashabExpense" | "karashabProfit" | "telecomIncome" | "firstPartyIncome" | "regionIncome" | "salesAgentIncome";

type ReportServiceLayout = "openapi" | "sms" | "sms-commission" | "psp" | "shahkar" | "traffic" | "default";

interface ReportExportColumn {
	title: string
	getValue: (row: PerformanceReportListItem) => string
}

function escapeHtml(value: unknown) {
	return String(value ?? "-")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&#39;");
}

function formatNumeric(value: unknown) {
	if (value == null || value === "")
		return "-";

	const numeric = Number(value);
	if (!Number.isFinite(numeric))
		return "-";

	return numeric.toLocaleString("en-US");
}

function formatMoney(value: unknown, showRial: boolean) {
	if (value == null || value === "")
		return "-";

	const numeric = Number(value);
	if (!Number.isFinite(numeric))
		return "-";

	return (showRial ? numeric : numeric / 10).toLocaleString("en-US");
}

function pickReportValue(row: Record<string, unknown>, keys: readonly string[]) {
	const record = row;
	for (const key of keys) {
		const value = record[key];
		if (value !== undefined && value !== null && value !== "")
			return value;
	}
	return null;
}

function buildRowsHtml(rows: PerformanceReportListItem[], columns: ReportExportColumn[]) {
	return rows.map(row => `<tr>${columns.map(column => `<td>${escapeHtml(column.getValue(row))}</td>`).join("")}</tr>`).join("");
}

function buildSummaryEntries(summary: PerformanceReportTotals | null | undefined, financialColumnTitles: Partial<Record<ReportFinancialColumnKey, string>>) {
	if (!summary || !financialColumnTitles.total)
		return [];

	const showRial = !!financialColumnTitles.rial;
	const entries: Array<[ReportFinancialColumnKey, string, string]> = [];
	const appendMoneyEntry = (key: ReportFinancialColumnKey, keys: readonly string[]) => {
		const label = financialColumnTitles[key];
		if (!label)
			return;

		const value = pickReportValue(summary, keys);
		if (value == null)
			return;

		entries.push([key, label, formatMoney(value, showRial)]);
	};

	entries.push(["total", financialColumnTitles.total, formatNumeric(summary.value)]);
	appendMoneyEntry("income", REPORT_FIELD_KEYS.income);
	appendMoneyEntry("expense", REPORT_FIELD_KEYS.expense);
	appendMoneyEntry("profit", REPORT_FIELD_KEYS.profit);
	appendMoneyEntry("karashabIncome", REPORT_FIELD_KEYS.karashabIncome);
	appendMoneyEntry("karashabExpense", REPORT_FIELD_KEYS.karashabExpense);
	appendMoneyEntry("karashabProfit", REPORT_FIELD_KEYS.karashabProfit);
	appendMoneyEntry("telecomIncome", REPORT_FIELD_KEYS.telecomIncome);
	appendMoneyEntry("firstPartyIncome", REPORT_FIELD_KEYS.firstPartyIncome);
	appendMoneyEntry("regionIncome", REPORT_FIELD_KEYS.regionIncome);
	appendMoneyEntry("salesAgentIncome", REPORT_FIELD_KEYS.salesAgentIncome);

	return entries;
}

function buildSummaryHtml(summary: PerformanceReportTotals | null | undefined, financialColumnTitles: Partial<Record<ReportFinancialColumnKey, string>>) {
	const entries = buildSummaryEntries(summary, financialColumnTitles);

	if (!entries.length)
		return "";

	return `<section class="summary"><h3>جمع‌بندی</h3><div class="summary-grid">${entries.map(([, label, value]) => `<div class="summary-item"><span class="summary-label">${escapeHtml(label)}</span><strong class="summary-value">${escapeHtml(value)}</strong></div>`).join("")}</div></section>`;
}

function buildExcelSummaryRows(summary: PerformanceReportTotals | null | undefined, financialColumnTitles: Partial<Record<ReportFinancialColumnKey, string>>, columnsCount: number) {
	const entries = buildSummaryEntries(summary, financialColumnTitles);

	if (!entries.length)
		return "";

	const trailingCell = columnsCount > 2 ? `<td class="empty-cell" colspan="${columnsCount - 2}"></td>` : "";

	return `
		<tr class="spacer-row"><td colspan="${columnsCount}"></td></tr>
		<tr><td class="summary-title" colspan="2">جمع‌بندی</td>${trailingCell}</tr>
		${entries.map(([, label, value]) => `<tr><td class="summary-label">${escapeHtml(label)}</td><td class="summary-value">${escapeHtml(value)}</td>${trailingCell}</tr>`).join("")}
	`;
}

function getExcelColumnWidth(column: ReportExportColumn) {
	return Math.min(Math.max(column.title.length * 7 + 28, 68), 140);
}

function buildExcelColgroup(columns: ReportExportColumn[]) {
	return `<colgroup>${columns.map((column) => {
		const width = getExcelColumnWidth(column);
		return `<col width="${width}" style="width:${width}pt;mso-width-source:userset" />`;
	}).join("")}</colgroup>`;
}

function buildExcelHeaderHtml(columns: ReportExportColumn[]) {
	return columns
		.map(column => `<th style="width:${getExcelColumnWidth(column)}pt">${escapeHtml(column.title)}</th>`)
		.join("");
}

function buildExcelRowsHtml(rows: PerformanceReportListItem[], columns: ReportExportColumn[]) {
	return rows
		.map(row => `<tr>${columns.map(column => `<td style="width:${getExcelColumnWidth(column)}pt">${escapeHtml(column.getValue(row))}</td>`).join("")}</tr>`)
		.join("");
}

function buildExcelHtml(args: {
	title: string
	serviceLabel?: string
	serviceName?: string | null
	currencyLabel?: string
	currencyValue?: string
	rows: PerformanceReportListItem[]
	columns: ReportExportColumn[]
	summary: PerformanceReportTotals | null | undefined
	financialColumnTitles: Partial<Record<ReportFinancialColumnKey, string>>
}) {
	const { title, serviceLabel, serviceName, currencyLabel, currencyValue, rows, columns, summary, financialColumnTitles } = args;
	const today = new Date().toLocaleDateString("fa-IR");
	const columnsCount = Math.max(columns.length, 1);
	const metaItems = [
		`تاریخ تولید: ${today}`,
		serviceName ? `${serviceLabel ?? "سرویس"}: ${serviceName}` : "",
		currencyValue ? `${currencyLabel ?? "واحد پول"}: ${currencyValue}` : "",
	].filter(Boolean);

	return `<!doctype html>
<html lang="fa" dir="rtl" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
	<meta charset="UTF-8" />
	<!--[if gte mso 9]>
	<xml>
		<x:ExcelWorkbook>
			<x:ExcelWorksheets>
				<x:ExcelWorksheet>
					<x:Name>${escapeHtml(title)}</x:Name>
					<x:WorksheetOptions>
						<x:DisplayRightToLeft/>
					</x:WorksheetOptions>
				</x:ExcelWorksheet>
			</x:ExcelWorksheets>
		</x:ExcelWorkbook>
	</xml>
	<![endif]-->
	<style>
		body {
			font-family: Tahoma, Arial, sans-serif;
			direction: rtl;
		}
		table {
			border-collapse: collapse;
			direction: rtl;
			table-layout: auto;
		}
		th, td {
			border: 0.5pt solid #7f7f7f;
			color: #000;
			font-family: Tahoma, Arial, sans-serif;
			font-size: 10pt;
			height: 22pt;
			padding: 4pt 6pt;
			text-align: center;
			vertical-align: middle;
			white-space: nowrap;
			mso-number-format: "\\@";
		}
		th {
			background: #dbe5f1;
			font-weight: 700;
		}
		.title-row td {
			background: #d9d9d9;
			border: 1pt solid #000;
			font-size: 12pt;
			font-weight: 700;
			height: 22pt;
		}
		.meta-row td {
			border: 1pt solid #000;
			font-size: 10pt;
			font-weight: 600;
			height: 22pt;
		}
		.spacer-row td {
			border: none;
			background: #fff;
			height: 14pt;
		}
		.empty-cell {
			border: none;
			background: #fff;
		}
		.summary-title {
			background: #dbe5f1;
			font-weight: 700;
			text-align: right;
		}
		.summary-label {
			background: #dbe5f1;
			font-weight: 700;
		}
		.summary-value {
			font-weight: 700;
		}
	</style>
</head>
<body>
	<table>
		${buildExcelColgroup(columns)}
		<tr class="title-row"><td colspan="${columnsCount}">${escapeHtml(title)}</td></tr>
		<tr class="meta-row"><td colspan="${columnsCount}">${escapeHtml(metaItems.join(" | "))}</td></tr>
		<tr class="spacer-row"><td colspan="${columnsCount}"></td></tr>
		<thead>
			<tr>${buildExcelHeaderHtml(columns)}</tr>
		</thead>
		<tbody>
			${buildExcelRowsHtml(rows, columns)}
			${buildExcelSummaryRows(summary, financialColumnTitles, columnsCount)}
		</tbody>
	</table>
</body>
</html>`;
}

function buildBaseHtml(args: {
	title: string
	serviceLabel?: string
	serviceName?: string | null
	currencyLabel?: string
	currencyValue?: string
	rows: PerformanceReportListItem[]
	columns: ReportExportColumn[]
	summary: PerformanceReportTotals | null | undefined
	financialColumnTitles: Partial<Record<ReportFinancialColumnKey, string>>
}) {
	const { title, serviceLabel, serviceName, currencyLabel, currencyValue, rows, columns, summary, financialColumnTitles } = args;
	const today = new Date().toLocaleDateString("fa-IR");
	const origin = window.location.origin;
	const logoUrl = `${origin}/negah-logo.svg`;
	const compactTable = columns.length > 12;

	return `<!doctype html>
<html lang="fa" dir="rtl" class="${compactTable ? "compact-table" : ""}">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${escapeHtml(title)}</title>
	<style>
		@font-face {
			font-family: "IranYekan";
			src: url("${origin}/fonts/eot/iranyekanwebregularfanum.eot");
			src:
				url("${origin}/fonts/eot/iranyekanwebregularfanum.eot?#iefix") format("embedded-opentype"),
				url("${origin}/fonts/woff/iranyekanwebregularfanum.woff") format("woff"),
				url("${origin}/fonts/ttf/iranyekanwebregularfanum.ttf") format("truetype");
			font-weight: 400;
			font-style: normal;
			font-display: swap;
		}
		@font-face {
			font-family: "IranYekan";
			src: url("${origin}/fonts/eot/iranyekanwebmediumfanum.eot");
			src:
				url("${origin}/fonts/eot/iranyekanwebmediumfanum.eot?#iefix") format("embedded-opentype"),
				url("${origin}/fonts/woff/iranyekanwebmediumfanum.woff") format("woff"),
				url("${origin}/fonts/ttf/iranyekanwebmediumfanum.ttf") format("truetype");
			font-weight: 500;
			font-style: normal;
			font-display: swap;
		}
		@font-face {
			font-family: "IranYekan";
			src: url("${origin}/fonts/eot/iranyekanwebboldfanum.eot");
			src:
				url("${origin}/fonts/eot/iranyekanwebboldfanum.eot?#iefix") format("embedded-opentype"),
				url("${origin}/fonts/woff/iranyekanwebboldfanum.woff") format("woff"),
				url("${origin}/fonts/ttf/iranyekanwebboldfanum.ttf") format("truetype");
			font-weight: 700;
			font-style: normal;
			font-display: swap;
		}
		body {
			font-family: "IranYekan", Tahoma, Arial, sans-serif;
			background: #f6f8fd;
			color: #0f172a;
			margin: 0;
			padding: 24px;
			box-sizing: border-box;
		}
		* {
			box-sizing: inherit;
		}
		.container {
			max-width: 1200px;
			margin: 0 auto;
		}
		.card {
			background: #fff;
			border: 1px solid #dbe4f5;
			border-radius: 16px;
			padding: 20px;
		}
		.header {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 10px;
			margin-bottom: 20px;
			text-align: center;
		}
		.brand {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 8px;
			min-width: 0;
		}
		.brand-logo {
			width: 120px;
			height: auto;
			object-fit: contain;
			flex: 0 0 auto;
		}
		.title {
			font-size: 22px;
			font-weight: 700;
		}
		.meta {
			font-size: 13px;
			color: #64748b;
		}
		.report-meta {
			display: flex;
			flex-wrap: wrap;
			justify-content: center;
			gap: 8px 18px;
			margin-bottom: 16px;
			font-size: 14px;
			font-weight: 500;
			text-align: center;
		}
		.report-meta-item {
			white-space: nowrap;
		}
		table {
			width: max-content;
			min-width: 100%;
			border-collapse: collapse;
			font-size: 13px;
			table-layout: auto;
		}
		th, td {
			border: 1px solid #dbe4f5;
			padding: 10px 12px;
			text-align: center;
			white-space: nowrap;
		}
		th {
			background: #eef4ff;
			font-weight: 700;
		}
		.compact-table .container {
			max-width: none;
		}
		.compact-table table {
			font-size: 10px;
		}
		.compact-table th,
		.compact-table td {
			padding: 6px 5px;
			line-height: 1.45;
		}
		.table-fit {
			--table-scale: 1;
			width: 100%;
			overflow: hidden;
		}
		.table-fit.is-scaled {
			height: var(--table-scaled-height);
		}
		.table-fit.is-scaled table {
			transform: scale(var(--table-scale));
			transform-origin: top right;
		}
		.summary {
			margin-top: 18px;
			border: 1px solid #dbe4f5;
			border-radius: 14px;
			padding: 16px;
			background: #f8fbff;
		}
		.summary h3 {
			margin: 0 0 12px;
			font-size: 16px;
		}
		.summary-grid {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 12px;
		}
		.summary-item {
			border: 1px solid #dbe4f5;
			border-radius: 12px;
			padding: 12px;
			background: #fff;
		}
		.summary-label {
			display: block;
			font-size: 12px;
			color: #64748b;
			margin-bottom: 6px;
		}
		.summary-value {
			font-size: 15px;
		}
		.report-footer {
			margin-top: 18px;
			padding-top: 12px;
			border-top: 1px solid #dbe4f5;
			color: #64748b;
			font-size: 12px;
			text-align: center;
		}
		@page {
			size: A4 landscape;
			margin: 8mm;
		}
		@media print {
			html,
			body {
				width: 100%;
			}
			body {
				background: #fff;
				padding: 0;
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
			}
			.container {
				max-width: none;
				width: 100%;
			}
			.card {
				border: none;
				padding: 0;
			}
			table {
				page-break-inside: auto;
			}
			tr {
				page-break-inside: avoid;
				page-break-after: auto;
			}
			thead {
				display: table-header-group;
			}
			.summary {
				page-break-inside: avoid;
			}
			.report-footer {
				page-break-inside: avoid;
			}
		}
		@media print and (max-width: 1200px) {
			.compact-table table {
				font-size: 8px;
			}
			.compact-table th,
			.compact-table td {
				padding: 4px 3px;
			}
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="card">
			<div class="header">
				<div class="brand">
					<img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="نگاه" />
					<div class="title">${escapeHtml(title)}</div>
				</div>
				<div class="meta">تاریخ تولید: ${escapeHtml(today)}</div>
			</div>
			<div class="report-meta">
				${serviceName ? `<span class="report-meta-item">${escapeHtml(serviceLabel ?? "سرویس")}: ${escapeHtml(serviceName)}</span>` : ""}
				${currencyValue ? `<span class="report-meta-item">${escapeHtml(currencyLabel ?? "واحد پول")}: ${escapeHtml(currencyValue)}</span>` : ""}
			</div>
			<div class="table-fit">
				<table>
					<thead>
						<tr>${columns.map(column => `<th>${escapeHtml(column.title)}</th>`).join("")}</tr>
					</thead>
					<tbody>
						${buildRowsHtml(rows, columns)}
					</tbody>
				</table>
			</div>
			${buildSummaryHtml(summary, financialColumnTitles)}
			<div class="report-footer">این گزارش به صورت خودکار از سامانه تولید شده است.</div>
		</div>
	</div>
	<script>
		(function () {
			function fitTable() {
				var wrapper = document.querySelector(".table-fit");
				var table = wrapper && wrapper.querySelector("table");
				if (!wrapper || !table)
					return;

				wrapper.classList.remove("is-scaled");
				wrapper.style.removeProperty("--table-scale");
				wrapper.style.removeProperty("--table-scaled-height");

				var availableWidth = wrapper.clientWidth;
				var tableWidth = table.scrollWidth;
				if (!availableWidth || !tableWidth || tableWidth <= availableWidth)
					return;

				var scale = Math.min(1, availableWidth / tableWidth);
				wrapper.style.setProperty("--table-scale", String(scale));
				wrapper.style.setProperty("--table-scaled-height", (table.offsetHeight * scale) + "px");
				wrapper.classList.add("is-scaled");
			}
			function scheduleFitTable() {
				window.requestAnimationFrame(function () {
					window.requestAnimationFrame(fitTable);
				});
			}

			window.addEventListener("load", scheduleFitTable);
			window.addEventListener("resize", scheduleFitTable);
			window.addEventListener("beforeprint", fitTable);
			if (document.fonts && document.fonts.ready)
				document.fonts.ready.then(scheduleFitTable).catch(scheduleFitTable);
			scheduleFitTable();
		})();
	</script>
</body>
</html>`;
}

export function downloadPerformanceReportExcel(args: {
	filename: string
	title: string
	serviceLabel?: string
	serviceName?: string | null
	currencyLabel?: string
	currencyValue?: string
	rows: PerformanceReportListItem[]
	columns: ReportExportColumn[]
	summary: PerformanceReportTotals | null | undefined
	financialColumnTitles: Partial<Record<ReportFinancialColumnKey, string>>
}) {
	const html = buildExcelHtml(args);
	const blob = new Blob([`\uFEFF${html}`], { type: "application/vnd.ms-excel;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = args.filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

export function openPerformanceReportPdfPrint(args: {
	title: string
	serviceLabel?: string
	serviceName?: string | null
	currencyLabel?: string
	currencyValue?: string
	rows: PerformanceReportListItem[]
	columns: ReportExportColumn[]
	summary: PerformanceReportTotals | null | undefined
	financialColumnTitles: Partial<Record<ReportFinancialColumnKey, string>>
}) {
	const win = window.open("", "_blank", "width=1200,height=860");
	if (!win)
		throw new Error("POPUP_BLOCKED");

	const html = buildBaseHtml(args);
	win.document.open();
	win.document.write(html);
	win.document.close();

	const triggerPrint = () => {
		win.focus();
		win.print();
	};

	void win.document.fonts?.ready
		.then(() => {
			setTimeout(triggerPrint, 250);
		})
		.catch(() => {
			setTimeout(triggerPrint, 500);
		});
}

function getSalesAgentExportValue(row: PerformanceReportListItem) {
	const name = pickReportValue(row, ["sales_agent_name", "salesAgentName"]);
	if (name)
		return String(name);
	const agent = pickReportValue(row, ["sales_agent", "sales_agent_id", "agent"]);
	return agent == null ? "-" : String(agent);
}

function getReportServiceName(row: PerformanceReportListItem, fallback?: string | null) {
	const serviceName = String(row.service_name ?? "").trim();
	if (serviceName)
		return serviceName;
	return fallback || "-";
}

function buildLayoutExportColumns(args: {
	layout: Exclude<ReportServiceLayout, "default">
	idTitle: string
	serviceNameTitle: string
	serviceNameFallback?: string | null
	companyNameTitle: string
	companyTypeTitle: string
	yearTitle: string
	monthTitle: string
	operationTypeTitle: string
	operatorTitle: string
	languageTitle: string
	countTitle: string
	unitPriceTitle: string
	incomeTitle: string
	expenseTitle: string
	profitTitle: string
	totalTitle: string
	contractTypeTitle: string
	karashabIncomeTitle: string
	karashabExpenseTitle: string
	karashabProfitTitle: string
	telecomIncomeTitle: string
	firstPartyIncomeTitle: string
	regionIncomeTitle: string
	salesAgentTitle: string
	salesAgentIncomeTitle: string
	monthNameByValue: (month: unknown) => string
	operationTypeLabelByValue: (operationType: unknown) => string
	operatorLabelByValue: (operator: unknown) => string
	languageLabelByValue: (language: unknown) => string
	contractTypeLabelByValue: (isOfficial: unknown) => string
	companyTypeLabelByValue: (companyType: unknown) => string
	contractUnitTitle?: string
	positionTitle?: string
	sentTrafficTitle?: string
	receivedTrafficTitle?: string
	sentTrafficGbMonthTitle?: string
	receivedTrafficGbMonthTitle?: string
	sentTrafficMbpsTitle?: string
	receivedTrafficMbpsTitle?: string
	conversionRatioTitle?: string
	datacenterTitle?: string
	partnerTypeTitle?: string
	rackHalfCountTitle?: string
	ipCountTitle?: string
	portCountTitle?: string
	bandwidthUsedTitle?: string
	ampereUsedTitle?: string
	rackHalfIncomeTitle?: string
	rackIncomeTitle?: string
	ipIncomeTitle?: string
	portIncomeTitle?: string
	bandwidthIncomeTitle?: string
	ampereIncomeTitle?: string
	trafficLocationLabelByValue?: (location: unknown) => string
	trafficLayout?: TrafficReportLayout
	periodType?: PeriodType
	financialColumnTitles: Partial<Record<ReportFinancialColumnKey, string>>
	hideCompanyColumn?: boolean
	hideMonthColumn?: boolean
	hideOperatorColumn?: boolean
	hideLanguageColumn?: boolean
}) {
	const periodType = args.periodType ?? "sh";
	const showRial = !!args.financialColumnTitles.rial;
	const columns: ReportExportColumn[] = [
		{ title: args.idTitle, getValue: row => String(row.id ?? "-") },
	];

	if (args.layout === "shahkar") {
		columns.push({
			title: args.serviceNameTitle,
			getValue: row => getReportServiceName(row, args.serviceNameFallback),
		});
		if (!args.hideCompanyColumn) {
			columns.push({
				title: args.companyNameTitle,
				getValue: row => String(row.company_name ?? "-"),
			});
		}
		columns.push({
			title: args.yearTitle,
			getValue: row => String(getReportYearValue(row, periodType)),
		});
		if (!args.hideMonthColumn) {
			columns.push({
				title: args.monthTitle,
				getValue: row => String(getReportMonthLabel(row, periodType)),
			});
		}
		columns.push({
			title: args.countTitle,
			getValue: row => formatNumeric(row.value),
		});
		if (args.financialColumnTitles.income) {
			columns.push({
				title: args.incomeTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.income]), showRial),
			});
		}
		if (args.financialColumnTitles.expense) {
			columns.push({
				title: args.expenseTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.expense]), showRial),
			});
		}
		if (args.financialColumnTitles.profit) {
			columns.push({
				title: args.profitTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.profit]), showRial),
			});
		}
		return columns;
	}

	if (args.layout === "traffic") {
		const trafficLayout = args.trafficLayout ?? "cp";
		columns.push({
			title: args.serviceNameTitle,
			getValue: row => getReportServiceName(row, args.serviceNameFallback),
		});
		if (!args.hideCompanyColumn) {
			columns.push({
				title: args.companyNameTitle,
				getValue: row => String(row.company_name ?? "-"),
			});
		}
		columns.push({
			title: args.companyTypeTitle,
			getValue: row => args.companyTypeLabelByValue(row.company_type),
		});
		columns.push({
			title: args.yearTitle,
			getValue: row => String(getReportYearValue(row, periodType)),
		});
		if (!args.hideMonthColumn) {
			columns.push({
				title: args.monthTitle,
				getValue: row => String(getReportMonthLabel(row, periodType)),
			});
		}

		if (trafficLayout === "collocation") {
			columns.push(
				{
					title: args.datacenterTitle ?? "",
					getValue: row => formatReportDatacenterName(pickReportValue(row, [...REPORT_FIELD_KEYS.datacenter])),
				},
				{
					title: args.partnerTypeTitle ?? "",
					getValue: (row) => {
						const value = pickReportValue(row, [...REPORT_FIELD_KEYS.collocationMode]);
						return value == null ? "-" : String(value);
					},
				},
				{
					title: args.rackHalfCountTitle ?? "",
					getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.rackHalfCount])),
				},
				{
					title: args.ipCountTitle ?? "",
					getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.ipCount])),
				},
				{
					title: args.portCountTitle ?? "",
					getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.portCount])),
				},
				{
					title: args.bandwidthUsedTitle ?? "",
					getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.bandwidthUsed])),
				},
				{
					title: args.ampereUsedTitle ?? "",
					getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.ampereUsed])),
				},
				{
					title: args.rackHalfIncomeTitle ?? "",
					getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.rackHalfIncome]), showRial),
				},
				{
					title: args.rackIncomeTitle ?? "",
					getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.rackIncome]), showRial),
				},
				{
					title: args.ipIncomeTitle ?? "",
					getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.ipIncome]), showRial),
				},
				{
					title: args.portIncomeTitle ?? "",
					getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.portIncome]), showRial),
				},
				{
					title: args.bandwidthIncomeTitle ?? "",
					getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.bandwidthIncome]), showRial),
				},
				{
					title: args.ampereIncomeTitle ?? "",
					getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.ampereIncome]), showRial),
				},
			);
		}
		else if (trafficLayout === "tci-ixp") {
			columns.push(
				{
					title: args.conversionRatioTitle ?? "",
					getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.conversionRatio])),
				},
				{
					title: args.positionTitle ?? "",
					getValue: row => args.trafficLocationLabelByValue?.(pickReportValue(row, [...REPORT_FIELD_KEYS.location])) ?? "-",
				},
				{
					title: args.sentTrafficTitle ?? "",
					getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.sentTraffic])),
				},
				{
					title: args.receivedTrafficTitle ?? "",
					getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.receivedTraffic])),
				},
			);
		}
		else {
			columns.push(
				{
					title: args.contractUnitTitle ?? "",
					getValue: (row) => {
						const value = pickReportValue(row, [...REPORT_FIELD_KEYS.contractUnit]);
						return value == null ? "-" : String(value);
					},
				},
			);
			if (!args.financialColumnTitles.showBaseUnit) {
				columns.push({
					title: args.conversionRatioTitle ?? "",
					getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.conversionRatio])),
				});
			}
			columns.push({
				title: args.positionTitle ?? "",
				getValue: row => args.trafficLocationLabelByValue?.(pickReportValue(row, [...REPORT_FIELD_KEYS.location])) ?? "-",
			});
			if (args.financialColumnTitles.showBaseUnit) {
				columns.push(
					{
						title: args.sentTrafficTitle ?? "",
						getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.sentTraffic])),
					},
					{
						title: args.receivedTrafficTitle ?? "",
						getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.receivedTraffic])),
					},
				);
			}
			else {
				columns.push(
					{
						title: args.sentTrafficGbMonthTitle ?? "",
						getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.sentTrafficGbMonth])),
					},
					{
						title: args.receivedTrafficGbMonthTitle ?? "",
						getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.receivedTrafficGbMonth])),
					},
					{
						title: args.sentTrafficMbpsTitle ?? "",
						getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.sentTrafficMbps])),
					},
					{
						title: args.receivedTrafficMbpsTitle ?? "",
						getValue: row => formatNumeric(pickReportValue(row, [...REPORT_FIELD_KEYS.receivedTrafficMbps])),
					},
				);
			}
		}

		if (args.financialColumnTitles.income) {
			columns.push({
				title: args.incomeTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.income]), showRial),
			});
		}
		if (args.financialColumnTitles.expense) {
			columns.push({
				title: args.expenseTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.expense]), showRial),
			});
		}
		if (args.financialColumnTitles.profit) {
			columns.push({
				title: args.profitTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.profit]), showRial),
			});
		}
		if (args.financialColumnTitles.contractType) {
			columns.push({
				title: args.contractTypeTitle,
				getValue: row => args.contractTypeLabelByValue(row.is_official),
			});
		}
		return columns;
	}

	if (args.layout === "psp") {
		columns.push({
			title: args.companyTypeTitle,
			getValue: row => args.companyTypeLabelByValue(row.company_type),
		});
		columns.push({
			title: args.yearTitle,
			getValue: row => String(getReportYearValue(row, periodType)),
		});
		columns.push({
			title: args.countTitle,
			getValue: row => formatNumeric(row.value),
		});
		if (args.financialColumnTitles.income) {
			columns.push({
				title: args.incomeTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.income]), showRial),
			});
		}
		if (args.financialColumnTitles.expense) {
			columns.push({
				title: args.expenseTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.expense]), showRial),
			});
		}
		if (args.financialColumnTitles.profit) {
			columns.push({
				title: args.profitTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.profit]), showRial),
			});
		}
		return columns;
	}

	if (!args.hideCompanyColumn) {
		columns.push({
			title: args.companyNameTitle,
			getValue: row => String(row.company_name ?? "-"),
		});
	}

	columns.push({
		title: args.yearTitle,
		getValue: row => String(getReportYearValue(row, periodType)),
	});

	if (!args.hideMonthColumn) {
		columns.push({
			title: args.monthTitle,
			getValue: row => String(getReportMonthLabel(row, periodType)),
		});
	}

	if (args.layout === "sms" || args.layout === "sms-commission") {
		if (!args.hideOperatorColumn) {
			columns.push({
				title: args.operatorTitle,
				getValue: row => args.operatorLabelByValue(row.operator),
			});
		}
		if (!args.hideLanguageColumn) {
			columns.push({
				title: args.languageTitle,
				getValue: row => args.languageLabelByValue(row.language),
			});
		}
	}

	columns.push({
		title: args.countTitle,
		getValue: row => formatNumeric(row.value),
	});

	if (args.layout === "openapi") {
		columns.push({
			title: args.operationTypeTitle,
			getValue: row => args.operationTypeLabelByValue(row.operation_type),
		});
		if (args.financialColumnTitles.income) {
			columns.push({
				title: args.incomeTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.income]), showRial),
			});
		}
		if (args.financialColumnTitles.expense) {
			columns.push({
				title: args.expenseTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.expense]), showRial),
			});
		}
		if (args.financialColumnTitles.profit) {
			columns.push({
				title: args.profitTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.profit]), showRial),
			});
		}
		return columns;
	}

	if (args.layout === "sms") {
		columns.push({
			title: args.unitPriceTitle,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.unitPrice]), showRial),
		});
		if (args.financialColumnTitles.income) {
			columns.push({
				title: args.incomeTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.income]), showRial),
			});
		}
		if (args.financialColumnTitles.expense) {
			columns.push({
				title: args.expenseTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.expense]), showRial),
			});
		}
		if (args.financialColumnTitles.profit) {
			columns.push({
				title: args.profitTitle,
				getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.profit]), showRial),
			});
		}
		if (args.financialColumnTitles.contractType) {
			columns.push({
				title: args.contractTypeTitle,
				getValue: row => args.contractTypeLabelByValue(row.is_official),
			});
		}
		return columns;
	}

	if (args.financialColumnTitles.unitPrice) {
		columns.push({
			title: args.unitPriceTitle,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.unitPrice]), showRial),
		});
	}
	if (args.financialColumnTitles.karashabIncome) {
		columns.push({
			title: args.karashabIncomeTitle,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.karashabIncome]), showRial),
		});
	}
	if (args.financialColumnTitles.karashabExpense) {
		columns.push({
			title: args.karashabExpenseTitle,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.karashabExpense]), showRial),
		});
	}
	if (args.financialColumnTitles.karashabProfit) {
		columns.push({
			title: args.karashabProfitTitle,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.karashabProfit]), showRial),
		});
	}
	if (args.financialColumnTitles.telecomIncome) {
		columns.push({
			title: args.telecomIncomeTitle,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.telecomIncome]), showRial),
		});
	}
	if (args.financialColumnTitles.firstPartyIncome) {
		columns.push({
			title: args.firstPartyIncomeTitle,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.firstPartyIncome]), showRial),
		});
	}
	if (args.financialColumnTitles.regionIncome) {
		columns.push({
			title: args.regionIncomeTitle,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.regionIncome]), showRial),
		});
	}

	columns.push({
		title: args.salesAgentTitle,
		getValue: row => getSalesAgentExportValue(row),
	});

	if (args.financialColumnTitles.salesAgentIncome) {
		columns.push({
			title: args.salesAgentIncomeTitle,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.salesAgentIncome]), showRial),
		});
	}

	return columns;
}

function appendAuditExportColumns(
	columns: ReportExportColumn[],
	selectedAuditColumns: ReportAuditColumnKey[],
	createdByUserTitle: string,
	updatedByUserTitle: string,
) {
	if (selectedAuditColumns.includes("createdByUser")) {
		columns.push({
			title: createdByUserTitle,
			getValue: row => formatReportUserRef(row.created_by_user),
		});
	}
	if (selectedAuditColumns.includes("updatedByUser")) {
		columns.push({
			title: updatedByUserTitle,
			getValue: row => formatReportUserRef(row.updated_by_user),
		});
	}
	return columns;
}

export function createPerformanceReportExportColumns(args: {
	layout?: ReportServiceLayout
	idTitle: string
	serviceNameTitle: string
	serviceNameFallback?: string | null
	companyNameTitle: string
	companyTypeTitle: string
	yearTitle: string
	monthTitle: string
	operationTypeTitle: string
	operatorTitle: string
	languageTitle: string
	countTitle: string
	unitPriceTitle: string
	incomeTitle: string
	expenseTitle: string
	profitTitle: string
	totalTitle: string
	contractTypeTitle: string
	karashabIncomeTitle: string
	karashabExpenseTitle: string
	karashabProfitTitle: string
	telecomIncomeTitle: string
	firstPartyIncomeTitle: string
	regionIncomeTitle: string
	salesAgentTitle: string
	salesAgentIncomeTitle: string
	monthNameByValue: (month: unknown) => string
	operationTypeLabelByValue: (operationType: unknown) => string
	operatorLabelByValue: (operator: unknown) => string
	languageLabelByValue: (language: unknown) => string
	contractTypeLabelByValue: (isOfficial: unknown) => string
	companyTypeLabelByValue: (companyType: unknown) => string
	contractUnitTitle?: string
	positionTitle?: string
	sentTrafficTitle?: string
	receivedTrafficTitle?: string
	sentTrafficGbMonthTitle?: string
	receivedTrafficGbMonthTitle?: string
	sentTrafficMbpsTitle?: string
	receivedTrafficMbpsTitle?: string
	conversionRatioTitle?: string
	datacenterTitle?: string
	partnerTypeTitle?: string
	rackHalfCountTitle?: string
	ipCountTitle?: string
	portCountTitle?: string
	bandwidthUsedTitle?: string
	ampereUsedTitle?: string
	rackHalfIncomeTitle?: string
	rackIncomeTitle?: string
	ipIncomeTitle?: string
	portIncomeTitle?: string
	bandwidthIncomeTitle?: string
	ampereIncomeTitle?: string
	trafficLocationLabelByValue?: (location: unknown) => string
	trafficLayout?: TrafficReportLayout
	periodType?: PeriodType
	selectedAuditColumns?: ReportAuditColumnKey[]
	createdByUserTitle?: string
	updatedByUserTitle?: string
	financialColumnTitles: Partial<Record<ReportFinancialColumnKey, string>>
	hideCompanyColumn?: boolean
	hideMonthColumn?: boolean
	showOperatorLanguageColumns?: boolean
	hideOperatorColumn?: boolean
	hideLanguageColumn?: boolean
}) {
	const layout = args.layout ?? "default";
	const periodType = args.periodType ?? "sh";
	const selectedAuditColumns = args.selectedAuditColumns ?? [];
	const showRial = !!args.financialColumnTitles.rial;
	if (layout !== "default") {
		return appendAuditExportColumns(
			buildLayoutExportColumns({
				layout,
				idTitle: args.idTitle,
				serviceNameTitle: args.serviceNameTitle,
				serviceNameFallback: args.serviceNameFallback,
				companyNameTitle: args.companyNameTitle,
				companyTypeTitle: args.companyTypeTitle,
				yearTitle: args.yearTitle,
				monthTitle: args.monthTitle,
				operationTypeTitle: args.operationTypeTitle,
				operatorTitle: args.operatorTitle,
				languageTitle: args.languageTitle,
				countTitle: args.countTitle,
				unitPriceTitle: args.unitPriceTitle,
				incomeTitle: args.incomeTitle,
				expenseTitle: args.expenseTitle,
				profitTitle: args.profitTitle,
				totalTitle: args.totalTitle,
				contractTypeTitle: args.contractTypeTitle,
				karashabIncomeTitle: args.karashabIncomeTitle,
				karashabExpenseTitle: args.karashabExpenseTitle,
				karashabProfitTitle: args.karashabProfitTitle,
				telecomIncomeTitle: args.telecomIncomeTitle,
				firstPartyIncomeTitle: args.firstPartyIncomeTitle,
				regionIncomeTitle: args.regionIncomeTitle,
				salesAgentTitle: args.salesAgentTitle,
				salesAgentIncomeTitle: args.salesAgentIncomeTitle,
				monthNameByValue: args.monthNameByValue,
				operationTypeLabelByValue: args.operationTypeLabelByValue,
				operatorLabelByValue: args.operatorLabelByValue,
				languageLabelByValue: args.languageLabelByValue,
				contractTypeLabelByValue: args.contractTypeLabelByValue,
				companyTypeLabelByValue: args.companyTypeLabelByValue,
				contractUnitTitle: args.contractUnitTitle,
				positionTitle: args.positionTitle,
				sentTrafficTitle: args.sentTrafficTitle,
				receivedTrafficTitle: args.receivedTrafficTitle,
				sentTrafficGbMonthTitle: args.sentTrafficGbMonthTitle,
				receivedTrafficGbMonthTitle: args.receivedTrafficGbMonthTitle,
				sentTrafficMbpsTitle: args.sentTrafficMbpsTitle,
				receivedTrafficMbpsTitle: args.receivedTrafficMbpsTitle,
				conversionRatioTitle: args.conversionRatioTitle,
				datacenterTitle: args.datacenterTitle,
				partnerTypeTitle: args.partnerTypeTitle,
				rackHalfCountTitle: args.rackHalfCountTitle,
				ipCountTitle: args.ipCountTitle,
				portCountTitle: args.portCountTitle,
				bandwidthUsedTitle: args.bandwidthUsedTitle,
				ampereUsedTitle: args.ampereUsedTitle,
				rackHalfIncomeTitle: args.rackHalfIncomeTitle,
				rackIncomeTitle: args.rackIncomeTitle,
				ipIncomeTitle: args.ipIncomeTitle,
				portIncomeTitle: args.portIncomeTitle,
				bandwidthIncomeTitle: args.bandwidthIncomeTitle,
				ampereIncomeTitle: args.ampereIncomeTitle,
				trafficLocationLabelByValue: args.trafficLocationLabelByValue,
				trafficLayout: args.trafficLayout,
				periodType,
				financialColumnTitles: args.financialColumnTitles,
				hideCompanyColumn: args.hideCompanyColumn,
				hideMonthColumn: args.hideMonthColumn,
				hideOperatorColumn: args.hideOperatorColumn,
				hideLanguageColumn: args.hideLanguageColumn,
			}),
			selectedAuditColumns,
			args.createdByUserTitle ?? "",
			args.updatedByUserTitle ?? "",
		);
	}

	const baseColumns: ReportExportColumn[] = [];

	if (!args.hideCompanyColumn) {
		baseColumns.push({
			title: args.companyNameTitle,
			getValue: row => String(row.company_name ?? "-"),
		});
	}

	baseColumns.push({
		title: args.yearTitle,
		getValue: row => String(getReportYearValue(row, periodType)),
	});

	if (!args.hideMonthColumn) {
		baseColumns.push({
			title: args.monthTitle,
			getValue: row => String(getReportMonthLabel(row, periodType)),
		});
	}

	baseColumns.push({
		title: args.operationTypeTitle,
		getValue: row => args.operationTypeLabelByValue(row.operation_type),
	});

	if (args.showOperatorLanguageColumns && !args.hideOperatorColumn) {
		baseColumns.push({
			title: args.operatorTitle,
			getValue: row => args.operatorLabelByValue(row.operator),
		});
	}

	if (args.showOperatorLanguageColumns && !args.hideLanguageColumn) {
		baseColumns.push({
			title: args.languageTitle,
			getValue: row => args.languageLabelByValue(row.language),
		});
	}

	const financialColumns: ReportExportColumn[] = [];

	if (args.financialColumnTitles.income) {
		financialColumns.push({
			title: args.financialColumnTitles.income,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.income]), showRial),
		});
	}
	if (args.financialColumnTitles.expense) {
		financialColumns.push({
			title: args.financialColumnTitles.expense,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.expense]), showRial),
		});
	}
	if (args.financialColumnTitles.profit) {
		financialColumns.push({
			title: args.financialColumnTitles.profit,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.profit]), showRial),
		});
	}
	if (args.financialColumnTitles.contractType) {
		financialColumns.push({
			title: args.contractTypeTitle,
			getValue: row => args.contractTypeLabelByValue(row.is_official),
		});
	}
	if (args.financialColumnTitles.unitPrice) {
		financialColumns.push({
			title: args.financialColumnTitles.unitPrice,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.unitPrice]), showRial),
		});
	}
	if (args.financialColumnTitles.karashabIncome) {
		financialColumns.push({
			title: args.financialColumnTitles.karashabIncome,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.karashabIncome]), showRial),
		});
	}
	if (args.financialColumnTitles.karashabExpense) {
		financialColumns.push({
			title: args.financialColumnTitles.karashabExpense,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.karashabExpense]), showRial),
		});
	}
	if (args.financialColumnTitles.karashabProfit) {
		financialColumns.push({
			title: args.financialColumnTitles.karashabProfit,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.karashabProfit]), showRial),
		});
	}
	if (args.financialColumnTitles.telecomIncome) {
		financialColumns.push({
			title: args.financialColumnTitles.telecomIncome,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.telecomIncome]), showRial),
		});
	}
	if (args.financialColumnTitles.firstPartyIncome) {
		financialColumns.push({
			title: args.financialColumnTitles.firstPartyIncome,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.firstPartyIncome]), showRial),
		});
	}
	if (args.financialColumnTitles.regionIncome) {
		financialColumns.push({
			title: args.financialColumnTitles.regionIncome,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.regionIncome]), showRial),
		});
	}
	if (args.financialColumnTitles.salesAgentIncome) {
		financialColumns.push({
			title: args.financialColumnTitles.salesAgentIncome,
			getValue: row => formatMoney(pickReportValue(row, [...REPORT_FIELD_KEYS.salesAgentIncome]), showRial),
		});
	}

	return appendAuditExportColumns(
		[...baseColumns, ...financialColumns],
		selectedAuditColumns,
		args.createdByUserTitle ?? "",
		args.updatedByUserTitle ?? "",
	);
}
