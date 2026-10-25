import type { PerformanceContractListItem } from "#src/features/performance/api/performances.api";
import { describe, expect, it } from "vitest";
import { normalizeOpenApiContractModel, pickActiveContract } from "./performance.helpers";

describe("performance helpers", () => {
	it("picks a contract that is active only through a nested addendum", () => {
		const contract = {
			id: 1,
			company: 10,
			service: 3,
			start_jy: 1405,
			start_jm: 1,
			end_jy: 1405,
			end_jm: 3,
			addenda: [{ start_jy: 1405, start_jm: 4, end_jy: 1405, end_jm: 6, children: [{ start_jy: 1405, start_jm: 7, end_jy: 1405, end_jm: 8 }] }],
		} as PerformanceContractListItem;

		expect(pickActiveContract([contract], 1405, 2)?.id).toBe(1);
		expect(pickActiveContract([contract], 1405, 5)?.id).toBe(1);
		expect(pickActiveContract([contract], 1405, 8)?.id).toBe(1);
		expect(pickActiveContract([contract], 1405, 9)).toBeNull();
	});

	it("recognises the separated (legacy_2) open api model", () => {
		expect(normalizeOpenApiContractModel("LEGACY_2")).toBe("legacy_2");
		expect(normalizeOpenApiContractModel("legacy")).toBe("legacy");
		expect(normalizeOpenApiContractModel("package")).toBe("package");
		expect(normalizeOpenApiContractModel("unknown")).toBeNull();
	});
});
