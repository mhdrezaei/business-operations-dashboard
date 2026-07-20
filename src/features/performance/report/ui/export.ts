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

function pickReportValue(row: PerformanceReportListItem, keys: string[]) {
	const record = row as Record<string, unknown>;
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

function buildSummaryHtml(summary: PerformanceReportTotals | null | undefined, financialColumnTitles: Partial<Record<ReportFinancialColumnKey, string>>) {
	if (!summary || !financialColumnTitles.total)
		return "";

	const showRial = !!financialColumnTitles.rial;
	const entries = [
		["total", financialColumnTitles.total, formatNumeric(summary.value)],
		["income", financialColumnTitles.income, formatMoney(summary.income_financial, showRial)],
		["expense", financialColumnTitles.expense, formatMoney(summary.expense_financial, showRial)],
		["profit", financialColumnTitles.profit, formatMoney(summary.profit_financial, showRial)],
	].filter(([, label]) => !!label) as Array<[ReportFinancialColumnKey, string, string]>;

	if (!entries.length)
		return "";

	return `<section class="summary"><h3>جمع‌بندی</h3><div class="summary-grid">${entries.map(([, label, value]) => `<div class="summary-item"><span class="summary-label">${escapeHtml(label)}</span><strong class="summary-value">${escapeHtml(value)}</strong></div>`).join("")}</div></section>`;
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

	return `<!doctype html>
<html lang="fa" dir="rtl">
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
			align-items: center;
			justify-content: space-between;
			gap: 16px;
			margin-bottom: 20px;
		}
		.title {
			font-size: 22px;
			font-weight: 700;
		}
		.meta {
			font-size: 13px;
			color: #64748b;
		}
		.service-meta {
			margin-bottom: 16px;
			font-size: 14px;
			font-weight: 500;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			font-size: 13px;
		}
		th, td {
			border: 1px solid #dbe4f5;
			padding: 10px 12px;
			text-align: center;
		}
		th {
			background: #eef4ff;
			font-weight: 700;
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
		@media print {
			body {
				background: #fff;
				padding: 0;
			}
			.card {
				border: none;
				padding: 0;
			}
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="card">
			<div class="header">
				<div class="title">${escapeHtml(title)}</div>
				<div class="meta">تاریخ تولید: ${escapeHtml(today)}</div>
			</div>
			${serviceName ? `<div class="service-meta">${escapeHtml(serviceLabel ?? "سرویس")}: ${escapeHtml(serviceName)}</div>` : ""}
			${currencyValue ? `<div class="service-meta">${escapeHtml(currencyLabel ?? "واحد پول")}: ${escapeHtml(currencyValue)}</div>` : ""}
			<table>
				<thead>
					<tr>${columns.map(column => `<th>${escapeHtml(column.title)}</th>`).join("")}</tr>
				</thead>
				<tbody>
					${buildRowsHtml(rows, columns)}
				</tbody>
			</table>
			${buildSummaryHtml(summary, financialColumnTitles)}
		</div>
	</div>
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
	const html = buildBaseHtml(args);
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

function buildLayoutExportColumns(args: {
	layout: Exclude<ReportServiceLayout, "default">
	idTitle: string
	serviceNameTitle: string
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
			getValue: row => String(row.service_name ?? "-"),
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
			getValue: row => String(row.service_name ?? "-"),
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
