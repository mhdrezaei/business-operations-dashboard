import { describe, expect, it } from "vitest";
import { buildPerformanceEditSearch, EMPTY_PERFORMANCE_EDIT_SELECTION, parsePerformanceEditSelection } from "./performance-edit-selection";

describe("performance edit selection", () => {
	it("round-trips a full selection through the query string", () => {
		const selection = { serviceId: 2, serviceCode: "openapi", companyType: null, companyId: 1485, year: 1410, month: 1 };

		const search = buildPerformanceEditSearch(selection);

		expect(search).toBe("?serviceId=2&service=openapi&companyId=1485&year=1410&month=1");
		expect(parsePerformanceEditSelection(search)).toEqual(selection);
	});

	it("keeps the company type when the service has one", () => {
		const search = buildPerformanceEditSearch({ ...EMPTY_PERFORMANCE_EDIT_SELECTION, serviceId: 3, serviceCode: "traffic", companyType: "OUTBOUND" });

		expect(parsePerformanceEditSelection(search)).toMatchObject({ serviceId: 3, companyType: "OUTBOUND" });
	});

	it("writes nothing until a service is selected", () => {
		expect(buildPerformanceEditSearch(EMPTY_PERFORMANCE_EDIT_SELECTION)).toBe("");
	});

	it("ignores a missing or invalid service id and non-numeric values", () => {
		expect(parsePerformanceEditSelection("")).toEqual(EMPTY_PERFORMANCE_EDIT_SELECTION);
		expect(parsePerformanceEditSelection("?serviceId=abc&year=1410")).toEqual(EMPTY_PERFORMANCE_EDIT_SELECTION);
		expect(parsePerformanceEditSelection("?serviceId=2&companyId=x&month=-1")).toMatchObject({ serviceId: 2, companyId: null, month: null });
	});
});
