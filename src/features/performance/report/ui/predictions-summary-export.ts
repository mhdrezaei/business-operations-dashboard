import type { TFunction } from "i18next";
import type { PredictionSummaryMetric } from "./predictions-summary-format";
import { downloadExcelHtml } from "./export";
import { formatDecimal, formatSummaryNumber } from "./predictions-summary-format";

export type PredictionSummarySection = "performance" | "predictions";
export type PredictionSummaryPeriodMode = "shamsi_months" | "fiscal_months" | "shamsi_quarters" | "fiscal_quarters";

export interface PredictionSummaryDisplayRow {
	key: string
	serviceCode: string
	serviceName: string
	periodKey: string
	periodLabel: string
	periodMonthsLabel: string
	isFiscal: boolean
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
	newCustomerCount: unknown
	newCustomerIncome: unknown
	performanceIncome: unknown
}

interface PredictionSummaryExportMeta {
	servicesLabel: string
	periodsLabel: string
	periodMode: PredictionSummaryPeriodMode
	showRial: boolean
	t: TFunction
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

interface ExportMetric {
	key: PredictionSummaryMetric
	label: string
}

const SHAHKAR_METRIC_KEYS: PredictionSummaryMetric[] = ["new_customer_count", "new_customer_income", "performance_income"];

const METRIC_LABEL_KEYS: Record<PredictionSummaryMetric, string> = {
	value: "performance.columns.count",
	value_receive: "performance.fields.traffic.receivedTraffic",
	income: "performance.columns.income",
	expense: "performance.columns.expense",
	profit: "performance.columns.profit",
	new_customer_count: "performance.columns.newCustomerCount",
	new_customer_income: "performance.columns.newCustomerIncome",
	performance_income: "performance.columns.performanceIncome",
};

export function getMetricLabel(metric: PredictionSummaryMetric, t: TFunction) {
	return t(METRIC_LABEL_KEYS[metric]);
}

export function getSectionLabel(section: PredictionSummarySection, t: TFunction) {
	return t(`performance.predictionsSummary.sections.${section}`);
}

export function getCurrencyLabel(showRial: boolean, t: TFunction) {
	return t(showRial ? "performance.columns.rial" : "performance.columns.toman");
}

export function getPeriodModeLabel(periodMode: PredictionSummaryPeriodMode, t: TFunction) {
	return t(`performance.predictionsSummary.periodModes.${periodMode}`);
}

const ROW_FIELD_BY_METRIC: Record<PredictionSummaryMetric, keyof PredictionSummaryDisplayRow> = {
	value: "value",
	value_receive: "receivedTraffic",
	income: "income",
	expense: "expense",
	profit: "profit",
	new_customer_count: "newCustomerCount",
	new_customer_income: "newCustomerIncome",
	performance_income: "performanceIncome",
};

function getExportMetrics(rows: PredictionSummaryDisplayRow[], withShahkar: boolean, t: TFunction): ExportMetric[] {
	const trafficOnly = rows.length > 0 && rows.every(row => row.serviceCode === "traffic");
	const keys: PredictionSummaryMetric[] = [
		"value",
		...(trafficOnly ? ["value_receive" as const] : []),
		"income",
		"expense",
		"profit",
		...(withShahkar && rows.some(row => row.serviceCode === "shahkar") ? SHAHKAR_METRIC_KEYS : []),
	];
	return keys.map(key => ({
		key,
		label: key === "value" && trafficOnly ? t("performance.fields.traffic.sentTraffic") : getMetricLabel(key, t),
	}));
}

function escapeHtml(value: unknown) {
	return String(value ?? "-")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&#39;");
}

export function formatTrafficValues(row: PredictionSummaryDisplayRow, direction: "sent" | "received") {
	const sent = direction === "sent";
	const parts = [
		formatTrafficValue(sent ? row.sentTrafficGbMonth : row.receivedTrafficGbMonth, "GB/month"),
		formatTrafficValue(sent ? row.sentTrafficMbps : row.receivedTrafficMbps, "Mbps"),
	].filter(part => part !== "-");
	return parts.length > 0
		? parts.join("\n")
		: formatTrafficValue(sent ? row.sentTraffic : row.receivedTraffic, sent ? row.sentTrafficUnit : row.receivedTrafficUnit);
}

function formatTrafficValue(value: unknown, unit: string | null) {
	const formatted = formatDecimal(value);
	return formatted === "-" || !unit ? formatted : `${unit}: ${formatted}`;
}

export function formatSummaryMetric(row: PredictionSummaryDisplayRow, metric: PredictionSummaryMetric, showRial: boolean) {
	if (row.serviceCode === "traffic" && (metric === "value" || metric === "value_receive")) {
		if (row.isTrafficCollocation)
			return metric === "value" ? row.trafficResourcesLabel : "-";
		return formatTrafficValues(row, metric === "value" ? "sent" : "received");
	}
	return formatSummaryNumber(row[ROW_FIELD_BY_METRIC[metric]], metric, showRial);
}

function getCellKey(section: PredictionSummarySection, metric: PredictionSummaryMetric, periodKey: string) {
	return `${section}:${metric}:${periodKey}`;
}

function createSingleTableModel(rows: PredictionSummaryDisplayRow[], metrics: ExportMetric[], showRial: boolean) {
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

		metrics.forEach((metric) => {
			groupedRow!.values[getCellKey(row.section, metric.key, row.periodKey)] = formatSummaryMetric(row, metric.key, showRial);
		});
	});

	return { periods, rows: Array.from(groupedRows.values()) };
}

function getMetadata(meta: PredictionSummaryExportMeta) {
	const { t } = meta;
	const raw = { interpolation: { escapeValue: false } };
	return [
		t("performance.predictionsSummary.meta.services", { value: meta.servicesLabel, ...raw }),
		t("performance.predictionsSummary.meta.periodType", { value: getPeriodModeLabel(meta.periodMode, t), ...raw }),
		t("performance.predictionsSummary.meta.periods", { value: meta.periodsLabel, ...raw }),
		t("performance.predictionsSummary.meta.prices", { value: getCurrencyLabel(meta.showRial, t), ...raw }),
	].join(" | ");
}

function getLogoUrl() {
	return typeof window === "undefined" ? "/negah-logo.svg" : `${window.location.origin}/negah-logo.svg`;
}

function buildHeader(columnsCount: number, meta: PredictionSummaryExportMeta) {
	return `<table class="report-header"><tr><td class="title" colspan="${columnsCount}">${escapeHtml(meta.t("common.menu.predictionsSummaryReport"))}</td></tr><tr><td class="meta" colspan="${columnsCount}">${escapeHtml(getMetadata(meta))}</td></tr><tr><td colspan="${columnsCount}" style="text-align:right"><img src="${escapeHtml(getLogoUrl())}" alt="Logo" /></td></tr></table>`;
}

function buildExcelDocument(content: string) {
	return `<!doctype html><html lang="fa" dir="rtl" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8" /><style>
	body{direction:rtl;font-family:Tahoma,Arial,sans-serif}table{border-collapse:collapse;direction:rtl}th,td{border:.5pt solid #94a3b8;font-size:9pt;padding:4pt 6pt;text-align:center;vertical-align:middle;white-space:pre-line;mso-number-format:"\\@"}th{background:#f1f5f9;font-weight:700}.report-header td{border:0}.title{font-size:14pt;font-weight:700}.meta{color:#475569}.report-header img{height:20px}.group-start{border-left:1.5pt solid #64748b}
	</style></head><body>${content}</body></html>`;
}

const CLASSIC_LEADING_HEADER_KEYS = [
	"performance.columns.service",
	"performance.predictionsSummary.columns.section",
	"performance.predictionsSummary.columns.type",
	"performance.columns.year",
	"performance.predictionsSummary.columns.period",
	"performance.predictionsSummary.columns.calendar",
	"performance.predictionsSummary.columns.realMonths",
];

function buildClassicTable(rows: PredictionSummaryDisplayRow[], meta: PredictionSummaryExportMeta, multiline: boolean) {
	const { t } = meta;
	const metrics = getExportMetrics(rows, false, t);
	const headers = [...CLASSIC_LEADING_HEADER_KEYS.map(key => t(key)), ...metrics.map(metric => metric.label)];
	const body = rows.map((row) => {
		const metricCells = metrics.map((metric) => {
			const cell = escapeHtml(formatSummaryMetric(row, metric.key, meta.showRial));
			return `<td>${multiline ? cell.replaceAll("\n", "<br />") : cell}</td>`;
		}).join("");
		return `<tr><td>${escapeHtml(row.serviceName)}</td><td>${getSectionLabel(row.section, t)}</td><td>${escapeHtml(row.typeLabel)}</td><td>${escapeHtml(row.yearLabel)}</td><td>${escapeHtml(row.periodLabel)}</td><td>${t(row.isFiscal ? "performance.predictionsSummary.calendar.fiscal" : "performance.predictionsSummary.calendar.shamsi")}</td><td>${escapeHtml(row.periodMonthsLabel)}</td>${metricCells}</tr>`;
	}).join("");
	return { headers, table: `<table><thead><tr>${headers.map(header => `<th>${header}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>` };
}

function buildClassicExcel(rows: PredictionSummaryDisplayRow[], meta: PredictionSummaryExportMeta) {
	const { headers, table } = buildClassicTable(rows, meta, false);
	return buildExcelDocument(`${buildHeader(headers.length, meta)}${table}`);
}

function buildSingleTableExcel(rows: PredictionSummaryDisplayRow[], meta: PredictionSummaryExportMeta) {
	const { t } = meta;
	const metrics = getExportMetrics(rows, true, t);
	const model = createSingleTableModel(rows, metrics, meta.showRial);
	const periodCount = Math.max(model.periods.length, 1);
	const columnsCount = 2 + periodCount * metrics.length * 2;
	const metricHeaders = (prediction: boolean) => metrics.map((metric, index) => `<th colspan="${periodCount}" class="${(prediction && index === 0) || index > 0 ? "group-start" : ""}">${metric.label}</th>`).join("");
	const periodHeaders = (section: PredictionSummarySection) => metrics.flatMap((metric, metricIndex) => model.periods.map((period, periodIndex) => `<th class="${(section === "predictions" && metricIndex === 0 && periodIndex === 0) || (metricIndex > 0 && periodIndex === 0) ? "group-start" : ""}">${escapeHtml(period.label)}</th>`)).join("");
	const body = model.rows.map(row => `<tr><td>${escapeHtml(row.serviceName)}</td><td>${escapeHtml(row.typeLabel)}</td>${(["performance", "predictions"] as PredictionSummarySection[]).flatMap(section => metrics.flatMap(metric => model.periods.map(period => `<td>${escapeHtml(row.values[getCellKey(section, metric.key, period.key)] ?? "-")}</td>`))).join("")}</tr>`).join("");
	return buildExcelDocument(`${buildHeader(columnsCount, meta)}<table><thead><tr><th rowspan="3">${t("performance.columns.service")}</th><th rowspan="3">${t("performance.predictionsSummary.columns.type")}</th><th colspan="${periodCount * metrics.length}">${getSectionLabel("performance", t)}</th><th colspan="${periodCount * metrics.length}" class="group-start">${getSectionLabel("predictions", t)}</th></tr><tr>${metricHeaders(false)}${metricHeaders(true)}</tr><tr>${periodHeaders("performance")}${periodHeaders("predictions")}</tr></thead><tbody>${body}</tbody></table>`);
}

function downloadHtml(filename: string, html: string) {
	downloadExcelHtml(html, filename);
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
	const { table } = buildClassicTable(rows, meta, true);
	const origin = typeof window === "undefined" ? "" : window.location.origin;
	return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="UTF-8" /><title>${escapeHtml(meta.t("common.menu.predictionsSummaryReport"))}</title><style>
	@font-face{font-family:IranYekan;src:url("${origin}/fonts/woff/iranyekanwebregularfanum.woff") format("woff")}@page{size:A4 landscape;margin:11mm}*{box-sizing:border-box}body{direction:rtl;font-family:IranYekan,Tahoma,Arial,sans-serif;margin:0;color:#0f172a}.header{align-items:center;display:grid;grid-template-columns:120px 1fr 120px;margin-bottom:10px}.header img{justify-self:start;width:95px}h1{font-size:18px;margin:0 0 4px;text-align:center}.meta{color:#64748b;font-size:9px;text-align:center}table{border:1px solid #dbe4f0;border-collapse:collapse;table-layout:fixed;width:100%}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #dbe4f0;font-size:7.5px;line-height:1.55;overflow-wrap:anywhere;padding:4px 3px;text-align:center;vertical-align:middle}th{font-weight:700}
	</style></head><body><div class="header"><img src="${escapeHtml(getLogoUrl())}" alt="${escapeHtml(meta.t("performance.predictionsSummary.brand"))}" /><div><h1>${escapeHtml(meta.t("common.menu.predictionsSummaryReport"))}</h1><div class="meta">${escapeHtml(getMetadata(meta))}</div></div><div></div></div>${table}</body></html>`;
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
