export type OfficialFilter = "all" | "official" | "unofficial";

export function officialFilterToParam(filter: OfficialFilter) {
	if (filter === "all")
		return null;
	return filter === "official";
}
