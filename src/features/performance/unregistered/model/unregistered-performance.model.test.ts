import { describe, expect, it } from "vitest";
import { getUnregisteredPerformanceRowKey } from "./unregistered-performance.model";

describe("getUnregisteredPerformanceRowKey", () => {
	const base = { service_id: 1, company_id: 2, sh_year: 1403, sh_month: 5 };

	it("differs between official and unofficial rows", () => {
		expect(getUnregisteredPerformanceRowKey({ ...base, is_official: true }))
			.not
			.toBe(getUnregisteredPerformanceRowKey({ ...base, is_official: false }));
	});

	it("differs between company types", () => {
		expect(getUnregisteredPerformanceRowKey({ ...base, company_type: "INBOUND" }))
			.not
			.toBe(getUnregisteredPerformanceRowKey({ ...base, company_type: "OUTBOUND" }));
	});
});
