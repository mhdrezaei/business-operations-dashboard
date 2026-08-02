export type PredictionSummarySection = "performance" | "predictions";
type PredictionSummaryMetric = "value" | "income" | "expense" | "profit";
type PredictionSummaryPeriodMode = "shamsi_months" | "fiscal_months" | "shamsi_quarters" | "fiscal_quarters";

export interface PredictionSummaryDisplayRow {
	key: string
	serviceCode: string
	serviceName: string
	periodKey: string
	periodLabel: string
	periodMonthsLabel: string
	calendarLabel: string
	yearLabel: string
	section: PredictionSummarySection
	typeLabel: string
	value: unknown
	sentTraffic: unknown
	sentTrafficUnit: string | null
	sentTrafficMbps: unknown
	sentTrafficGbMonth: unknown
	receivedTraffic: unknown
	receivedTrafficUnit: string | null
	receivedTrafficMbps: unknown
	receivedTrafficGbMonth: unknown
	trafficResourcesLabel: string
	isTrafficCollocation: boolean
	income: unknown
	expense: unknown
	profit: unknown
}

interface PredictionSummaryExportMeta {
	serviceCount: number
	periodCount: number
	periodMode: PredictionSummaryPeriodMode
	showRial: boolean
}

interface SingleTablePeriod {
	key: string
	label: string
}

interface SingleTableRow {
	key: string
	serviceName: string
	typeLabel: string
	values: Record<string, string>
}

const METRICS: Array<{ key: PredictionSummaryMetric, label: string }> = [
	{ key: "value", label: "تعداد" },
	{ key: "income", label: "درآمد" },
	{ key: "expense", label: "هزینه" },
	{ key: "profit", label: "سود" },
];

function escapeHtml(value: unknown) {
	return String(value ?? "-")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&#39;");
}

function formatNumber(value: unknown, showRial = true) {
	if (value === null || value === undefined || value === "")
		return "-";
	const numeric = Number(value);
	if (!Number.isFinite(numeric))
		return "-";
	return (showRial ? numeric : numeric / 10).toLocaleString("fa-IR", { maximumFractionDigits: 4 });
}

function formatTrafficValue(value: unknown, unit: string | null) {
	const formatted = formatNumber(value);
	return formatted === "-" || !unit ? formatted : `${unit}: ${formatted}`;
}

function formatTrafficCount(row: PredictionSummaryDisplayRow) {
	if (row.isTrafficCollocation)
		return row.trafficResourcesLabel;
	const values = [
		formatTrafficValue(row.sentTrafficGbMonth, "GB/month"),
		formatTrafficValue(row.sentTrafficMbps, "Mbps"),
	].filter(value => value !== "-");
	return values.length > 0 ? values.join("\n") : formatTrafficValue(row.sentTraffic, row.sentTrafficUnit);
}

function formatCell(row: PredictionSummaryDisplayRow, metric: PredictionSummaryMetric, showRial: boolean) {
	if (metric === "value" && row.serviceCode === "traffic")
		return formatTrafficCount(row);
	return formatNumber(row[metric], metric === "value" || showRial);
}

function getCellKey(section: PredictionSummarySection, metric: PredictionSummaryMetric, periodKey: string) {
	return `${section}:${metric}:${periodKey}`;
}

function createSingleTableModel(rows: PredictionSummaryDisplayRow[], showRial: boolean) {
	const periods: SingleTablePeriod[] = [];
	const seenPeriods = new Set<string>();
	const groupedRows = new Map<string, SingleTableRow>();

	rows.forEach((row) => {
		if (!seenPeriods.has(row.periodKey)) {
			seenPeriods.add(row.periodKey);
			periods.push({ key: row.periodKey, label: row.periodLabel });
		}

		const rowKey = `${row.serviceCode}\u0000${row.typeLabel}`;
		let groupedRow = groupedRows.get(rowKey);
		if (!groupedRow) {
			groupedRow = { key: rowKey, serviceName: row.serviceName, typeLabel: row.typeLabel, values: {} };
			groupedRows.set(rowKey, groupedRow);
		}

		METRICS.forEach((metric) => {
			groupedRow!.values[getCellKey(row.section, metric.key, row.periodKey)] = formatCell(row, metric.key, showRial);
		});
	});

	return { periods, rows: Array.from(groupedRows.values()) };
}

function getPeriodModeLabel(periodMode: PredictionSummaryPeriodMode) {
	const labels: Record<PredictionSummaryPeriodMode, string> = {
		shamsi_months: "سال و ماه شمسی",
		fiscal_months: "سال و ماه مالی",
		shamsi_quarters: "سال و کوارتر شمسی",
		fiscal_quarters: "سال و کوارتر مالی",
	};
	return labels[periodMode];
}

function getMetadata(meta: PredictionSummaryExportMeta) {
	return [
		`سرویس‌ها: ${meta.serviceCount.toLocaleString("fa-IR")} سرویس`,
		`نوع دوره: ${getPeriodModeLabel(meta.periodMode)}`,
		`بازه‌ها: ${meta.periodCount.toLocaleString("fa-IR")} بازه`,
		`قیمت‌ها: ${meta.showRial ? "ریال" : "تومان"}`,
	].join(" | ");
}

function getLogoUrl() {
	return typeof window === "undefined" ? "/negah-logo.svg" : `${window.location.origin}/negah-logo.svg`;
}

function buildHeader(columnsCount: number, meta: PredictionSummaryExportMeta) {
	return `<table class="report-header"><tr><td class="title" colspan="${columnsCount}">گزارش تجمیعی عملکرد و پیش‌بینی</td></tr><tr><td class="meta" colspan="${columnsCount}">${escapeHtml(getMetadata(meta))}</td></tr><tr><td colspan="${columnsCount}" style="text-align:right"><img src="${escapeHtml(getLogoUrl())}" alt="Logo" /></td></tr></table>`;
}

function buildExcelDocument(content: string) {
	return `<!doctype html><html lang="fa" dir="rtl" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8" /><style>
	body{direction:rtl;font-family:Tahoma,Arial,sans-serif}table{border-collapse:collapse;direction:rtl}th,td{border:.5pt solid #94a3b8;font-size:9pt;padding:4pt 6pt;text-align:center;vertical-align:middle;white-space:pre-line;mso-number-format:"\\@"}th{background:#f1f5f9;font-weight:700}.report-header td{border:0}.title{font-size:14pt;font-weight:700}.meta{color:#475569}.report-header img{height:20px}.group-start{border-left:1.5pt solid #64748b}
	</style></head><body>${content}</body></html>`;
}

function stripMonthsPrefix(value: string) {
	return value.replace("ماه‌های واقعی: ", "").replace("ماه‌های واقعی:", "");
}

function buildClassicExcel(rows: PredictionSummaryDisplayRow[], meta: PredictionSummaryExportMeta) {
	const headers = ["سرویس", "بخش", "نوع", "سال", "بازه", "تقویم", "ماه‌های واقعی", "تعداد", "درآمد", "هزینه", "سود"];
	const body = rows.map(row => `<tr><td>${escapeHtml(row.serviceName)}</td><td>${row.section === "performance" ? "عملکرد" : "پیش‌بینی"}</td><td>${escapeHtml(row.typeLabel)}</td><td>${escapeHtml(row.yearLabel)}</td><td>${escapeHtml(row.periodLabel)}</td><td>${row.calendarLabel.includes("مالی") ? "مالی" : "شمسی"}</td><td>${escapeHtml(stripMonthsPrefix(row.periodMonthsLabel))}</td><td>${escapeHtml(formatCell(row, "value", meta.showRial))}</td><td>${escapeHtml(formatCell(row, "income", meta.showRial))}</td><td>${escapeHtml(formatCell(row, "expense", meta.showRial))}</td><td>${escapeHtml(formatCell(row, "profit", meta.showRial))}</td></tr>`).join("");
	return buildExcelDocument(`${buildHeader(headers.length, meta)}<table><thead><tr>${headers.map(header => `<th>${header}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`);
}

function buildSingleTableExcel(rows: PredictionSummaryDisplayRow[], meta: PredictionSummaryExportMeta) {
	const model = createSingleTableModel(rows, meta.showRial);
	const periodCount = Math.max(model.periods.length, 1);
	const columnsCount = 2 + periodCount * METRICS.length * 2;
	const metricHeaders = (prediction: boolean) => METRICS.map((metric, index) => `<th colspan="${periodCount}" class="${(prediction && index === 0) || index > 0 ? "group-start" : ""}">${metric.label}</th>`).join("");
	const periodHeaders = (section: PredictionSummarySection) => METRICS.flatMap((metric, metricIndex) => model.periods.map((period, periodIndex) => `<th class="${(section === "predictions" && metricIndex === 0 && periodIndex === 0) || (metricIndex > 0 && periodIndex === 0) ? "group-start" : ""}">${escapeHtml(period.label)}</th>`)).join("");
	const body = model.rows.map(row => `<tr><td>${escapeHtml(row.serviceName)}</td><td>${escapeHtml(row.typeLabel)}</td>${(["performance", "predictions"] as PredictionSummarySection[]).flatMap(section => METRICS.flatMap(metric => model.periods.map(period => `<td>${escapeHtml(row.values[getCellKey(section, metric.key, period.key)] ?? "-")}</td>`))).join("")}</tr>`).join("");
	return buildExcelDocument(`${buildHeader(columnsCount, meta)}<table><thead><tr><th rowspan="3">سرویس</th><th rowspan="3">نوع</th><th colspan="${periodCount * METRICS.length}">عملکرد</th><th colspan="${periodCount * METRICS.length}" class="group-start">پیش‌بینی</th></tr><tr>${metricHeaders(false)}${metricHeaders(true)}</tr><tr>${periodHeaders("performance")}${periodHeaders("predictions")}</tr></thead><tbody>${body}</tbody></table>`);
}

function downloadHtml(filename: string, html: string) {
	const blob = new Blob([`\uFEFF${html}`], { type: "application/vnd.ms-excel;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.style.display = "none";
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadPredictionSummaryExcel(args: {
	filename: string
	rows: PredictionSummaryDisplayRow[]
	meta: PredictionSummaryExportMeta
	mode: "classic" | "single-table"
}) {
	downloadHtml(args.filename, args.mode === "single-table" ? buildSingleTableExcel(args.rows, args.meta) : buildClassicExcel(args.rows, args.meta));
}

function buildPrintHtml(rows: PredictionSummaryDisplayRow[], meta: PredictionSummaryExportMeta) {
	const headers = ["سرویس", "بخش", "نوع", "سال", "بازه", "تقویم", "ماه‌های واقعی", "تعداد", "درآمد", "هزینه", "سود"];
	const body = rows.map(row => `<tr><td>${escapeHtml(row.serviceName)}</td><td>${row.section === "performance" ? "عملکرد" : "پیش‌بینی"}</td><td>${escapeHtml(row.typeLabel)}</td><td>${escapeHtml(row.yearLabel)}</td><td>${escapeHtml(row.periodLabel)}</td><td>${row.calendarLabel.includes("مالی") ? "مالی" : "شمسی"}</td><td>${escapeHtml(stripMonthsPrefix(row.periodMonthsLabel))}</td><td>${escapeHtml(formatCell(row, "value", meta.showRial)).replaceAll("\n", "<br />")}</td><td>${escapeHtml(formatCell(row, "income", meta.showRial))}</td><td>${escapeHtml(formatCell(row, "expense", meta.showRial))}</td><td>${escapeHtml(formatCell(row, "profit", meta.showRial))}</td></tr>`).join("");
	const origin = typeof window === "undefined" ? "" : window.location.origin;
	return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="UTF-8" /><title>گزارش تجمیعی عملکرد و پیش‌بینی</title><style>
	@font-face{font-family:IranYekan;src:url("${origin}/fonts/woff/iranyekanwebregularfanum.woff") format("woff")}@page{size:A4 landscape;margin:11mm}*{box-sizing:border-box}body{direction:rtl;font-family:IranYekan,Tahoma,Arial,sans-serif;margin:0;color:#0f172a}.header{align-items:center;display:grid;grid-template-columns:120px 1fr 120px;margin-bottom:10px}.header img{justify-self:start;width:95px}h1{font-size:18px;margin:0 0 4px;text-align:center}.meta{color:#64748b;font-size:9px;text-align:center}table{border:1px solid #dbe4f0;border-collapse:collapse;table-layout:fixed;width:100%}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #dbe4f0;font-size:7.5px;line-height:1.55;overflow-wrap:anywhere;padding:4px 3px;text-align:center;vertical-align:middle}th{font-weight:700}
	</style></head><body><div class="header"><img src="${escapeHtml(getLogoUrl())}" alt="نگاه" /><div><h1>گزارش تجمیعی عملکرد و پیش‌بینی</h1><div class="meta">${escapeHtml(getMetadata(meta))}</div></div><div></div></div><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

export function openPredictionSummaryPdfPrint(rows: PredictionSummaryDisplayRow[], meta: PredictionSummaryExportMeta) {
	const printWindow = window.open("", "_blank", "width=1200,height=860");
	if (!printWindow)
		throw new Error("POPUP_BLOCKED");
	printWindow.document.open();
	printWindow.document.write(buildPrintHtml(rows, meta));
	printWindow.document.close();
	const triggerPrint = () => {
		printWindow.focus();
		printWindow.print();
	};
	void printWindow.document.fonts?.ready
		.then(() => setTimeout(triggerPrint, 250))
		.catch(() => setTimeout(triggerPrint, 500));
}
