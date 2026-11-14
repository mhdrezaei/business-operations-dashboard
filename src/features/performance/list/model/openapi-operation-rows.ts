import type { PerformanceListItem } from "#src/features/performance/api/performances.api";

export function toUpperText(value: unknown) {
	return String(value ?? "").trim().toUpperCase();
}

export function getFirstDefinedValue(source: Record<string, unknown>, keys: string[]) {
	for (const key of keys) {
		const value = source[key];
		if (value != null && value !== "")
			return value;
	}
	return null;
}

export function getOpenApiOperationRowValue(
	rows: PerformanceListItem[],
	operationType: string,
	keys: string[],
) {
	const matchedRow = rows.find(row => toUpperText((row as Record<string, unknown>).operation_type) === operationType);
	if (!matchedRow)
		return null;

	return getFirstDefinedValue(matchedRow as Record<string, unknown>, keys);
}

/** Sum of a metric over several operation rows; null when none of them carries a value. */
export function sumOpenApiOperationRowValues(rows: PerformanceListItem[], operationTypes: string[], keys: string[]) {
	const values = operationTypes
		.map(operationType => getOpenApiOperationRowValue(rows, operationType, keys))
		.filter(value => value != null)
		.map(Number)
		.filter(Number.isFinite);
	return values.length > 0 ? values.reduce((total, value) => total + value, 0) : null;
}

export const SEPARATED_OPERATION_TYPES = [
	"BILL_INQUIRY_MIDTERM",
	"BILL_INQUIRY_ENDTERM",
	"RECEIPT_REGISTER_CONNECTED",
	"RECEIPT_REGISTER_DISCONNECTED",
] as const;

export interface SeparatedOperationBreakdown {
	operationType: (typeof SEPARATED_OPERATION_TYPES)[number]
	income: number | null
	expense: number | null
	profit: number | null
}

function toNumberOrNull(value: unknown) {
	const number = Number(value);
	return value == null || value === "" || !Number.isFinite(number) ? null : number;
}

/** Income / expense / profit of every operation of a separated ("legacy_2") OpenAPI month that has a row. */
export function buildSeparatedBreakdown(rows: PerformanceListItem[]): SeparatedOperationBreakdown[] {
	return SEPARATED_OPERATION_TYPES.flatMap((operationType) => {
		const row = rows.find(item => toUpperText((item as Record<string, unknown>).operation_type) === operationType) as Record<string, unknown> | undefined;
		if (!row)
			return [];
		return [{
			operationType,
			income: toNumberOrNull(row.income),
			expense: toNumberOrNull(row.expense),
			profit: toNumberOrNull(row.profit),
		}];
	});
}
