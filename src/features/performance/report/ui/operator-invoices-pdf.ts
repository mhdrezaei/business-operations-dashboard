import type { SmsOperatorCode, SmsOperatorInvoiceMonthlyReport } from "#src/features/performance/api/performances.api";

interface Args {
	report: SmsOperatorInvoiceMonthlyReport
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

function buildPrintHtml({ report, monthLabel, operatorName, formatNumber }: Args) {
	const summaryRows = (report.operator_totals ?? []).map((item) => {
		const invoiceCount = Number(item.manual_invoice.count ?? 0);
		const invoiceCost = Number(item.manual_invoice.cost ?? 0);
		const differenceCount = invoiceCount - Number(item.internal_system.total ?? 0);
		const differenceCost = invoiceCost - Number(item.internal_system.cost ?? 0);

		return `<tr><td>${escapeHtml(operatorName(item.operator))}</td><td>${escapeHtml(formatNumber(invoiceCount))}</td><td>${escapeHtml(formatNumber(invoiceCost))}</td><td>${escapeHtml(formatNumber(item.internal_system.total))}</td><td>${escapeHtml(formatNumber(item.internal_system.cost))}</td><td>${escapeHtml(formatNumber(item.gateway_total))}</td><td>${escapeHtml(formatNumber(differenceCount))}</td><td>${escapeHtml(formatNumber(differenceCost))}</td></tr>`;
	}).join("");
	const detailRows = (report.rows ?? []).map(item => `<tr><td>${escapeHtml(operatorName(item.operator))}</td><td>${item.language === "FA" ? "فارسی" : "انگلیسی"}</td><td>${item.manual_invoice.invoice_registered ? "ثبت شده" : escapeHtml(item.manual_invoice.message ?? "ثبت نشده")}</td><td>${escapeHtml(formatNumber(item.manual_invoice.count))}</td><td>${escapeHtml(formatNumber(item.manual_invoice.cost))}</td><td>${escapeHtml(formatNumber(item.internal_system_total))}</td><td>${escapeHtml(formatNumber(item.internal_system_cost))}</td><td>${escapeHtml(formatNumber(item.gateway_total))}</td></tr>`).join("");

	return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="UTF-8" /><title>گزارش مقایسه‌ای ماهانه فاکتورهای ارسالی اپراتور</title><style>
		@font-face{font-family:IranYekan;src:url("${escapeHtml(`${window.location.origin}/fonts/woff/iranyekanwebregularfanum.woff`)}") format("woff")}@page{size:A4 landscape;margin:11mm}*{box-sizing:border-box}body{color:#0f172a;direction:rtl;font-family:IranYekan,Tahoma,Arial,sans-serif;margin:0}.header{align-items:center;display:grid;grid-template-columns:120px 1fr 120px;margin-bottom:12px}.header img{justify-self:start;width:96px}h1{font-size:18px;margin:0 0 4px;text-align:center}.meta{color:#64748b;font-size:10px;text-align:center}h2{font-size:13px;margin:16px 0 7px}table{border:1px solid #dbe4f0;border-collapse:collapse;table-layout:fixed;width:100%}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #dbe4f0;font-size:8px;line-height:1.55;overflow-wrap:anywhere;padding:5px 4px;text-align:center;vertical-align:middle}th{background:#eff6ff;font-weight:700}.summary th{background:#ecfdf5}.detail{margin-top:8px}
	</style></head><body><div class="header"><img src="${escapeHtml(getLogoUrl())}" alt="نگاه" /><div><h1>گزارش مقایسه‌ای ماهانه فاکتورهای ارسالی اپراتور</h1><div class="meta">دوره گزارش: ${escapeHtml(monthLabel)} ماه سال ${escapeHtml(report.sh_year)}</div></div><div></div></div><h2>جمع کل هر اپراتور (فارسی + انگلیسی)</h2><table class="summary"><thead><tr><th>اپراتور</th><th>تعداد فاکتور</th><th>هزینه فاکتور (ریال)</th><th>تعداد سامانه نگاه</th><th>هزینه سامانه نگاه (ریال)</th><th>تعداد Gateway</th><th>اختلاف تعداد</th><th>اختلاف هزینه (ریال)</th></tr></thead><tbody>${summaryRows}</tbody></table><h2>به تفکیک اپراتور و زبان</h2><table class="detail"><thead><tr><th>اپراتور</th><th>زبان</th><th>وضعیت فاکتور ارسالی اپراتور</th><th>تعداد فاکتور ارسالی اپراتور</th><th>هزینه فاکتور ارسالی اپراتور (ریال)</th><th>تعداد سامانه نگاه</th><th>هزینه سامانه نگاه (ریال)</th><th>تعداد سامانه Gateway</th></tr></thead><tbody>${detailRows}</tbody></table></body></html>`;
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
