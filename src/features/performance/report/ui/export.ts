import type { PerformanceReportListItem, PerformanceReportTotals } from "#src/features/performance/api/performances.api";

export type ReportFinancialColumnKey
	= | "income" | "expense" | "profit" | "total" | "contractType" | "unitPrice" | "karashabIncome" | "karashabExpense" | "karashabProfit" | "telecomIncome" | "firstPartyIncome" | "regionIncome" | "salesAgentIncome";

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
	if (!summary)
		return "";

	const entries = [
		["total", financialColumnTitles.total, formatNumeric(summary.value)],
		["income", financialColumnTitles.income, formatNumeric(summary.income_financial)],
		["expense", financialColumnTitles.expense, formatNumeric(summary.expense_financial)],
		["profit", financialColumnTitles.profit, formatNumeric(summary.profit_financial)],
	].filter(([, label]) => !!label) as Array<[ReportFinancialColumnKey, string, string]>;

	if (!entries.length)
		return "";

	return `<section class="summary"><h3>جمع‌بندی</h3><div class="summary-grid">${entries.map(([, label, value]) => `<div class="summary-item"><span class="summary-label">${escapeHtml(label)}</span><strong class="summary-value">${escapeHtml(value)}</strong></div>`).join("")}</div></section>`;
}

function buildBaseHtml(args: {
	title: string
	serviceLabel?: string
	serviceName?: string | null
	rows: PerformanceReportListItem[]
	columns: ReportExportColumn[]
	summary: PerformanceReportTotals | null | undefined
	financialColumnTitles: Partial<Record<ReportFinancialColumnKey, string>>
}) {
	const { title, serviceLabel, serviceName, rows, columns, summary, financialColumnTitles } = args;
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

export function createPerformanceReportExportColumns(args: {
	companyNameTitle: string
	yearTitle: string
	monthTitle: string
	operationTypeTitle: string
	contractTypeTitle: string
	monthNameByValue: (month: unknown) => string
	operationTypeLabelByValue: (operationType: unknown) => string
	contractTypeLabelByValue: (isOfficial: unknown) => string
	financialColumnTitles: Partial<Record<ReportFinancialColumnKey, string>>
}) {
	const baseColumns: ReportExportColumn[] = [
		{
			title: args.companyNameTitle,
			getValue: row => String(row.company_name ?? "-"),
		},
		{
			title: args.yearTitle,
			getValue: row => String(row.sh_year ?? "-"),
		},
		{
			title: args.monthTitle,
			getValue: row => args.monthNameByValue(row.sh_month),
		},
		{
			title: args.operationTypeTitle,
			getValue: row => args.operationTypeLabelByValue(row.operation_type),
		},
	];

	const financialColumns: ReportExportColumn[] = [];

	if (args.financialColumnTitles.total) {
		financialColumns.push({
			title: args.financialColumnTitles.total,
			getValue: row => formatNumeric(row.value),
		});
	}
	if (args.financialColumnTitles.income) {
		financialColumns.push({
			title: args.financialColumnTitles.income,
			getValue: row => formatNumeric(row.income_financial),
		});
	}
	if (args.financialColumnTitles.expense) {
		financialColumns.push({
			title: args.financialColumnTitles.expense,
			getValue: row => formatNumeric(row.expense_financial),
		});
	}
	if (args.financialColumnTitles.profit) {
		financialColumns.push({
			title: args.financialColumnTitles.profit,
			getValue: row => formatNumeric(row.profit_financial),
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
			getValue: row => formatNumeric(pickReportValue(row, ["price", "unit_price", "sale_rate"])),
		});
	}
	if (args.financialColumnTitles.karashabIncome) {
		financialColumns.push({
			title: args.financialColumnTitles.karashabIncome,
			getValue: row => formatNumeric(pickReportValue(row, ["karashab_income", "income_karashab", "karashabIncome"])),
		});
	}
	if (args.financialColumnTitles.karashabExpense) {
		financialColumns.push({
			title: args.financialColumnTitles.karashabExpense,
			getValue: row => formatNumeric(pickReportValue(row, ["karashab_expense", "expense_karashab", "karashabExpense"])),
		});
	}
	if (args.financialColumnTitles.karashabProfit) {
		financialColumns.push({
			title: args.financialColumnTitles.karashabProfit,
			getValue: row => formatNumeric(pickReportValue(row, ["karashab_profit", "profit_karashab", "karashabProfit"])),
		});
	}
	if (args.financialColumnTitles.telecomIncome) {
		financialColumns.push({
			title: args.financialColumnTitles.telecomIncome,
			getValue: row => formatNumeric(pickReportValue(row, ["mokhaberat_income", "telecom_income", "income_mokhaberat", "income_telecom"])),
		});
	}
	if (args.financialColumnTitles.firstPartyIncome) {
		financialColumns.push({
			title: args.financialColumnTitles.firstPartyIncome,
			getValue: row => formatNumeric(pickReportValue(row, ["first_party_income", "income_first_party", "firstPartyIncome"])),
		});
	}
	if (args.financialColumnTitles.regionIncome) {
		financialColumns.push({
			title: args.financialColumnTitles.regionIncome,
			getValue: row => formatNumeric(pickReportValue(row, ["area_income", "region_income", "income_area", "income_region"])),
		});
	}
	if (args.financialColumnTitles.salesAgentIncome) {
		financialColumns.push({
			title: args.financialColumnTitles.salesAgentIncome,
			getValue: row => formatNumeric(pickReportValue(row, ["sales_agent_income", "income_sales_agent", "salesAgentIncome"])),
		});
	}

	return [...baseColumns, ...financialColumns];
}
