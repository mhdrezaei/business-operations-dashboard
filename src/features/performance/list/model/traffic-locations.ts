export type TrafficLocation = "TEHRAN" | "COUNTY";

export const TRAFFIC_LOCATIONS: ReadonlyArray<{ location: TrafficLocation, prefix: "tehran" | "county" }> = [
	{ location: "TEHRAN", prefix: "tehran" },
	{ location: "COUNTY", prefix: "county" },
];

/**
 * A location's fields are required only when the record already has that location
 * (a contract for the other location must not block saving). A record with no rows
 * at all still needs Tehran.
 */
export function isTrafficLocationRequired(location: TrafficLocation, existing: ReadonlySet<TrafficLocation>) {
	return existing.has(location) || (location === "TEHRAN" && existing.size === 0);
}
