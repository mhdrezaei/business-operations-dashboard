/** Newest first (start year/month descending). */
export function sortByStartDesc<T extends { start_jy?: number | null, start_jm?: number | null }>(contracts: T[]) {
	return [...contracts].sort((a, b) =>
		((b.start_jy ?? 0) - (a.start_jy ?? 0)) || ((b.start_jm ?? 0) - (a.start_jm ?? 0)));
}
