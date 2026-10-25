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
