export function isBlankValue(value: unknown) {
	return value == null || (typeof value === "string" && value.trim() === "");
}

export function toNumberOrNull(value: unknown): number | null {
	if (value == null || value === "")
		return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

export function toStringOrNull(value: unknown): string | null {
	if (value == null || value === "")
		return null;
	return String(value);
}

export function toIdOrStringOrNull(value: unknown): number | string | null {
	if (value == null || value === "")
		return null;
	const n = Number(value);
	return Number.isInteger(n) ? n : String(value);
}

export type Row = Record<string, unknown>;

export function asRecord(value: unknown): Row {
	return value != null && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

export function asRows(value: unknown): Row[] {
	return Array.isArray(value) ? value.filter((item): item is Row => item != null && typeof item === "object") : [];
}
