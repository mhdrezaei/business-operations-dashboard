import { describe, expect, it } from "vitest";
import { isCountyOptionalCompanyType } from "./traffic-locations";

describe("isCountyOptionalCompanyType", () => {
	it.each(["CP", "ixp", " Premium ", "TCI"])("allows removing county for %s", (type) => {
		expect(isCountyOptionalCompanyType(type)).toBe(true);
	});

	it.each(["COLLOCATION", "", null, undefined])("keeps county required for %s", (type) => {
		expect(isCountyOptionalCompanyType(type)).toBe(false);
	});
});
