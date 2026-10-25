import { describe, expect, it } from "vitest";
import { officialFilterToParam } from "./official-filter";

describe("side panel model", () => {
	it("maps the official filter to a query param", () => {
		expect(officialFilterToParam("all")).toBeNull();
		expect(officialFilterToParam("official")).toBe(true);
		expect(officialFilterToParam("unofficial")).toBe(false);
	});
});
