export const MAP_COORDINATE_DECIMAL_PLACES = 6;

export function normalizeMapCoordinate(value: string): string | null {
	const trimmedValue = value.trim();
	if (!trimmedValue)
		return null;

	const numericValue = Number(trimmedValue);
	return Number.isFinite(numericValue)
		? numericValue.toFixed(MAP_COORDINATE_DECIMAL_PLACES)
		: trimmedValue;
}
