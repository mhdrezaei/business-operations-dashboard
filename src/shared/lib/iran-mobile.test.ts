import { describe, expect, it } from "vitest";
import { normalizeIranMobile, toBackendMobile } from "./iran-mobile";

describe("iran mobile", () => {
	it("shows the backend 98 format as 09", () => {
		expect(normalizeIranMobile("989123456789")).toBe("09123456789");
		expect(normalizeIranMobile("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
	});

	it("sends 98 and keeps empty as null", () => {
		expect(toBackendMobile("09123456789")).toBe("989123456789");
		expect(toBackendMobile("")).toBeNull();
	});
});
