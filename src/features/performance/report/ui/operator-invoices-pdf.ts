import type { SmsOperatorCode, SmsOperatorInvoiceMonthlyReport } from "#src/features/performance/api/performances.api";
import type { ColumnsState } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import { formatInvoiceDifference, formatNullableNumber, getInvoiceDifference } from "#src/features/performance/report/model/sms-gateway-report";

interface Args {
	report: SmsOperatorInvoiceMonthlyReport
	summaryColumnsState?: Record<string, ColumnsState>
	detailColumnsState?: Record<string, ColumnsState>
	monthLabel: string
	t: TFunction
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

function buildPrintHtml({ report, monthLabel, t, operatorName, formatNumber, summaryColumnsState = {}, detailColumnsState = {} }: Args) {
	const summaryTable = buildTable(report.operator_totals ?? [], [
		{ key: "operator", title: t("performance.columns.operator"), value: item => operatorName(item.operator) },
		{ key: "manual_invoice", title: t("performance.smsGatewayPages.invoices.columns.invoiceStatus"), value: item => item.manual_invoice.invoice_registered ? t("performance.smsGatewayPages.shared.registered") : t("performance.smsGatewayPages.shared.notRegistered") },
		{ key: "manual_invoice_count", title: t("performance.smsGatewayPages.invoices.columns.invoiceCount"), value: item => formatNullableNumber(item.manual_invoice.count, formatNumber) },
		{ key: "manual_invoice_cost", title: t("performance.smsGatewayPages.invoices.columns.invoiceCost"), value: item => formatNullableNumber(item.manual_invoice.cost, formatNumber) },
		{ key: "internal_system_total", title: t("performance.smsGatewayPages.invoices.columns.internalCount"), value: item => formatNumber(item.internal_system.total) },
		{ key: "internal_system_cost", title: t("performance.smsGatewayPages.invoices.columns.internalCost"), value: item => formatNumber(item.internal_system.cost) },
		{ key: "gateway_total", title: t("performance.smsGatewayPages.invoices.columns.gatewayCount"), value: item => formatNumber(item.gateway_total) },
		{ key: "difference", title: t("performance.smsGatewayPages.invoices.columns.countDiff"), value: item => formatInvoiceDifference(getInvoiceDifference(item.manual_invoice.count, item.internal_system.total), formatNumber) },
		{ key: "cost_difference", title: t("performance.smsGatewayPages.invoices.columns.costDiff"), value: item => formatInvoiceDifference(getInvoiceDifference(item.manual_invoice.cost, item.internal_system.cost), formatNumber) },
	], summaryColumnsState);
	const detailTable = buildTable(report.rows ?? [], [
		{ key: "operator", title: t("performance.columns.operator"), value: item => operatorName(item.operator) },
		{ key: "language", title: t("performance.columns.language"), value: item => t(item.language === "FA" ? "performance.language.fa" : "performance.language.en") },
		{ key: "manual_invoice", title: t("performance.smsGatewayPages.invoices.columns.detailInvoiceStatus"), value: item => item.manual_invoice.invoice_registered ? t("performance.smsGatewayPages.shared.registered") : item.manual_invoice.message ?? t("performance.smsGatewayPages.shared.notRegistered") },
		{ key: "manual_invoice_count", title: t("performance.smsGatewayPages.invoices.columns.detailInvoiceCount"), value: item => formatNullableNumber(item.manual_invoice.count, formatNumber) },
		{ key: "manual_invoice_cost", title: t("performance.smsGatewayPages.invoices.columns.detailInvoiceCost"), value: item => formatNullableNumber(item.manual_invoice.cost, formatNumber) },
		{ key: "internal_system_total", title: t("performance.smsGatewayPages.invoices.columns.internalCount"), value: item => formatNumber(item.internal_system_total) },
		{ key: "internal_system_cost", title: t("performance.smsGatewayPages.invoices.columns.internalCost"), value: item => formatNumber(item.internal_system_cost) },
		{ key: "gateway_total", title: t("performance.smsGatewayPages.invoices.columns.detailGatewayCount"), value: item => formatNumber(item.gateway_total) },
	], detailColumnsState);

	return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="UTF-8" /><title>${escapeHtml(t("performance.smsGatewayPages.invoices.reportDocTitle"))}</title><style>
		@font-face{font-family:IranYekan;src:url("${escapeHtml(`${window.location.origin}/fonts/woff/iranyekanwebregularfanum.woff`)}") format("woff")}@page{size:A4 landscape;margin:11mm}*{box-sizing:border-box}body{color:#0f172a;direction:rtl;font-family:IranYekan,Tahoma,Arial,sans-serif;margin:0}.header{align-items:center;display:grid;grid-template-columns:120px 1fr 120px;margin-bottom:12px}.header img{justify-self:start;width:96px}h1{font-size:18px;margin:0 0 4px;text-align:center}.meta{color:#64748b;font-size:10px;text-align:center}h2{font-size:13px;margin:16px 0 7px}table{border:1px solid #dbe4f0;border-collapse:collapse;table-layout:fixed;width:100%}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #dbe4f0;font-size:8px;line-height:1.55;overflow-wrap:anywhere;padding:5px 4px;text-align:center;vertical-align:middle}th{background:#eff6ff;font-weight:700}.summary th{background:#ecfdf5}.detail{margin-top:8px}
	</style></head><body><div class="header"><img src="${escapeHtml(getLogoUrl())}" alt="${escapeHtml(t("performance.smsGatewayPages.invoices.logoAlt"))}" /><div><h1>${escapeHtml(t("performance.smsGatewayPages.invoices.reportDocTitle"))}</h1><div class="meta">${escapeHtml(t("performance.smsGatewayPages.invoices.reportPeriod", { month: monthLabel, year: report.sh_year }))}</div></div><div></div></div><h2>${escapeHtml(t("performance.smsGatewayPages.invoices.summaryTableTitle"))}</h2><table class="summary">${summaryTable}</table><h2>${escapeHtml(t("performance.smsGatewayPages.invoices.detailTableTitle"))}</h2><table class="detail">${detailTable}</table></body></html>`;
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
