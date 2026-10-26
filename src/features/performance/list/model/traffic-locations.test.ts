import { describe, expect, it } from "vitest";

import { isTrafficLocationRequired } from "./traffic-locations";

describe("isTrafficLocationRequired", () => {
	it("does not require county for a Tehran-only record", () => {
		const existing = new Set(["TEHRAN"] as const);
		expect(isTrafficLocationRequired("TEHRAN", existing)).toBe(true);
		expect(isTrafficLocationRequired("COUNTY", existing)).toBe(false);
	});
	it("does not require Tehran for a county-only record", () => {
		const existing = new Set(["COUNTY"] as const);
		expect(isTrafficLocationRequired("TEHRAN", existing)).toBe(false);
		expect(isTrafficLocationRequired("COUNTY", existing)).toBe(true);
	});
	it("requires only Tehran when nothing exists", () => {
		const existing = new Set<"TEHRAN" | "COUNTY">();
		expect(isTrafficLocationRequired("TEHRAN", existing)).toBe(true);
		expect(isTrafficLocationRequired("COUNTY", existing)).toBe(false);
	});
});
