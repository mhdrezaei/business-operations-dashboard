import { normalizeDigitsToLatin } from "#src/utils/formated";
import { divideDecimalStringByTen, formatDecimal } from "./predictions-summary-format";

export function formatReportNumber(value: unknown) {
	return formatDecimal(value);
}

/** Money columns are stored in rial; toman is shown by moving the decimal point, never by float division. */
export function formatReportMoney(value: unknown, showRial: boolean) {
	if (showRial)
		return formatDecimal(value);
	const text = String(value ?? "").trim();
	return /^-?\d+(?:\.\d+)?$/.test(text) ? formatDecimal(divideDecimalStringByTen(text)) : formatDecimal(value);
}

const NUMERIC_CELL_PATTERN = /^-?\d[\d\u066C]*(?:\u066B\d+)?$/;

/**
 * Excel needs real numbers: spreadsheet cells holding Persian digits or Persian separators are text,
 * so SUM and sorting fail. Every table cell gets Latin digits and pure numbers lose their separators ("۱۱٬۸۰۰٫۶۲" → "11800.62").
 */
export function toExcelHtml(html: string) {
	return normalizeDigitsToLatin(html).replace(/(<t[dh]\b[^>]*>)([^<]*)(<\/t[dh]>)/g, (_, open: string, text: string, close: string) => {
		const trimmed = text.trim();
		return `${open}${NUMERIC_CELL_PATTERN.test(trimmed) ? trimmed.replaceAll("\u066C", "").replace("\u066B", ".") : text}${close}`;
	});
}
