import type { SmsOperatorCode, SmsOperatorInvoiceMonthlyReport } from "#src/features/performance/api/performances.api";
import type { ColumnsState } from "@ant-design/pro-components";

interface Args {
	report: SmsOperatorInvoiceMonthlyReport
	summaryColumnsState?: Record<string, ColumnsState>
	detailColumnsState?: Record<string, ColumnsState>
	monthLabel: string
	operatorName: (operator: SmsOperatorCode) => string
	formatNumber: (value: number | null | undefined) => string
}

function escapeHtml(value: unknown) {
	return String(value ?? "-")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&#39;");
}

function getLogoUrl() {
	return `${window.location.origin}/negah-logo.svg`;
}

function buildTable<Row>(rows: Row[], columns: { key: string, title: string, value: (row: Row) => unknown }[], state: Record<string, ColumnsState>) {
	const visibleColumns = columns.filter(column => state[column.key]?.show !== false);
	const headers = visibleColumns.map(column => `<th>${escapeHtml(column.title)}</th>`).join("");
	const body = rows.map(row => `<tr>${visibleColumns.map(column => `<td>${escapeHtml(column.value(row))}</td>`).join("")}</tr>`).join("");
	return `<thead><tr>${headers}</tr></thead><tbody>${body}</tbody>`;
}

function buildPrintHtml({ report, monthLabel, operatorName, formatNumber, summaryColumnsState = {}, detailColumnsState = {} }: Args) {
	const summaryTable = buildTable(report.operator_totals ?? [], [
		{ key: "operator", title: "اپراتور", value: item => operatorName(item.operator) },
		{ key: "manual_invoice", title: "وضعیت فاکتور", value: item => item.manual_invoice.invoice_registered ? "ثبت شده" : "ثبت نشده" },
		{ key: "manual_invoice_count", title: "تعداد فاکتور", value: item => formatNumber(item.manual_invoice.count) },
		{ key: "manual_invoice_cost", title: "هزینه فاکتور (ریال)", value: item => formatNumber(item.manual_invoice.cost) },
		{ key: "internal_system_total", title: "تعداد سامانه نگاه", value: item => formatNumber(item.internal_system.total) },
		{ key: "internal_system_cost", title: "هزینه سامانه نگاه (ریال)", value: item => formatNumber(item.internal_system.cost) },
		{ key: "gateway_total", title: "تعداد Gateway", value: item => formatNumber(item.gateway_total) },
		{ key: "difference", title: "اختلاف تعداد", value: item => formatNumber(Number(item.manual_invoice.count ?? 0) - Number(item.internal_system.total ?? 0)) },
	], summaryColumnsState);
	const detailTable = buildTable(report.rows ?? [], [
		{ key: "operator", title: "اپراتور", value: item => operatorName(item.operator) },
		{ key: "language", title: "زبان", value: item => item.language === "FA" ? "فارسی" : "انگلیسی" },
		{ key: "manual_invoice", title: "وضعیت فاکتور ارسالی اپراتور", value: item => item.manual_invoice.invoice_registered ? "ثبت شده" : item.manual_invoice.message ?? "ثبت نشده" },
		{ key: "manual_invoice_count", title: "تعداد فاکتور ارسالی اپراتور", value: item => formatNumber(item.manual_invoice.count) },
		{ key: "manual_invoice_cost", title: "هزینه فاکتور ارسالی اپراتور (ریال)", value: item => formatNumber(item.manual_invoice.cost) },
		{ key: "internal_system_total", title: "تعداد سامانه نگاه", value: item => formatNumber(item.internal_system_total) },
		{ key: "internal_system_cost", title: "هزینه سامانه نگاه (ریال)", value: item => formatNumber(item.internal_system_cost) },
		{ key: "gateway_total", title: "تعداد سامانه Gateway", value: item => formatNumber(item.gateway_total) },
	], detailColumnsState);

	return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="UTF-8" /><title>گزارش مقایسه‌ای ماهانه فاکتورهای ارسالی اپراتور</title><style>
		@font-face{font-family:IranYekan;src:url("${escapeHtml(`${window.location.origin}/fonts/woff/iranyekanwebregularfanum.woff`)}") format("woff")}@page{size:A4 landscape;margin:11mm}*{box-sizing:border-box}body{color:#0f172a;direction:rtl;font-family:IranYekan,Tahoma,Arial,sans-serif;margin:0}.header{align-items:center;display:grid;grid-template-columns:120px 1fr 120px;margin-bottom:12px}.header img{justify-self:start;width:96px}h1{font-size:18px;margin:0 0 4px;text-align:center}.meta{color:#64748b;font-size:10px;text-align:center}h2{font-size:13px;margin:16px 0 7px}table{border:1px solid #dbe4f0;border-collapse:collapse;table-layout:fixed;width:100%}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #dbe4f0;font-size:8px;line-height:1.55;overflow-wrap:anywhere;padding:5px 4px;text-align:center;vertical-align:middle}th{background:#eff6ff;font-weight:700}.summary th{background:#ecfdf5}.detail{margin-top:8px}
	</style></head><body><div class="header"><img src="${escapeHtml(getLogoUrl())}" alt="نگاه" /><div><h1>گزارش مقایسه‌ای ماهانه فاکتورهای ارسالی اپراتور</h1><div class="meta">دوره گزارش: ${escapeHtml(monthLabel)} ماه سال ${escapeHtml(report.sh_year)}</div></div><div></div></div><h2>جمع کل هر اپراتور (فارسی + انگلیسی)</h2><table class="summary">${summaryTable}</table><h2>به تفکیک اپراتور و زبان</h2><table class="detail">${detailTable}</table></body></html>`;
}

export function openSmsOperatorInvoicesPdfPrint(args: Args) {
	const printWindow = window.open("", "_blank", "width=1200,height=860");
	if (!printWindow)
		throw new Error("POPUP_BLOCKED");

	printWindow.document.open();
	printWindow.document.write(buildPrintHtml(args));
	printWindow.document.close();

	const triggerPrint = () => {
		printWindow.focus();
		printWindow.print();
	};
	void printWindow.document.fonts?.ready
		.then(() => setTimeout(triggerPrint, 250))
		.catch(() => setTimeout(triggerPrint, 500));
}
