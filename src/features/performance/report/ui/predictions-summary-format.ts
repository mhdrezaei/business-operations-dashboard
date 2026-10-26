import type { TFunction } from "i18next";
import { toPersianDigits } from "#src/utils/formated";

export type PredictionSummaryMetric
	= "value" | "value_receive" | "income" | "expense" | "profit" | "new_customer_count" | "new_customer_income" | "performance_income";

const RIAL_CONVERTIBLE_METRICS = new Set<PredictionSummaryMetric>([
	"income",
	"expense",
	"profit",
	"new_customer_income",
	"performance_income",
]);

const RACK_FIELDS = [
	{ key: "rack_full_count", labelKey: "performance.predictionsSummary.collocation.rackFull" },
	{ key: "rack_half_count", labelKey: "performance.predictionsSummary.collocation.rackHalf" },
	{ key: "rack_quarter_count", labelKey: "performance.predictionsSummary.collocation.rackQuarter" },
	{ key: "rack_unit_count", labelKey: "performance.predictionsSummary.collocation.rackUnit" },
];

const COLLOCATION_RESOURCE_FIELDS = [
	{ key: "ip_count", labelKey: "performance.predictionsSummary.collocation.ip" },
	{ key: "port_count", labelKey: "performance.predictionsSummary.collocation.port" },
	{ key: "bandwidth_used", labelKey: "performance.predictionsSummary.collocation.bandwidth" },
	{ key: "ampere_used", labelKey: "performance.columns.ampereUsed" },
];

function normalizeDecimalString(value: unknown) {
	if (value === null || value === undefined || value === "")
		return null;
	const normalized = String(value)
		.trim()
		.replace(/[\u06F0-\u06F9\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) % 16))
		.replace(/\u066B/g, ".")
		.replace(/[\u066C\u060C,]/g, "");
	return /^-?\d+(?:\.\d+)?$/.test(normalized) ? normalized : null;
}

/** Divides a plain decimal string by 10 by moving the point, so no float rounding can occur. */
export function divideDecimalStringByTen(normalized: string) {
	const sign = normalized.startsWith("-") ? "-" : "";
	const [intPart, fracPart = ""] = (sign ? normalized.slice(1) : normalized).split(".");
	const padded = intPart.padStart(2, "0");
	const newInt = padded.slice(0, -1).replace(/^0+(?=\d)/, "");
	const newFrac = `${padded.slice(-1)}${fracPart}`.replace(/0+$/, "");
	const result = newFrac ? `${newInt}.${newFrac}` : newInt;
	return /^0(?:\.0*)?$/.test(result) ? "0" : `${sign}${result}`;
}

export function formatDecimal(value: unknown) {
	const normalized = normalizeDecimalString(value);
	if (normalized === null)
		return value === null || value === undefined || value === "" ? "-" : String(value);
	const sign = normalized.startsWith("-") ? "-" : "";
	const [intPart, fracPart] = (sign ? normalized.slice(1) : normalized).split(".");
	const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u066C");
	return toPersianDigits(`${sign}${grouped}${fracPart === undefined ? "" : `\u066B${fracPart}`}`);
}

export function formatSummaryNumber(value: unknown, metric: PredictionSummaryMetric, showRial: boolean) {
	const normalized = normalizeDecimalString(value);
	if (showRial || normalized === null || !RIAL_CONVERTIBLE_METRICS.has(metric))
		return formatDecimal(value);
	return formatDecimal(divideDecimalStringByTen(normalized));
}

export function formatCollocationUsage(record: Record<string, unknown>, t: TFunction) {
	return [
		...RACK_FIELDS
			.filter(field => Object.prototype.hasOwnProperty.call(record, field.key))
			.map(field => `${t(field.labelKey)}: ${formatDecimal(record[field.key])}`),
		...COLLOCATION_RESOURCE_FIELDS.map(field => `${t(field.labelKey)}: ${formatDecimal(record[field.key])}`),
	].join(" | ");
}
