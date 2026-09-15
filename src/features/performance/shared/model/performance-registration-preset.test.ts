import { describe, expect, it } from "vitest";
import { buildUnregisteredPerformanceSearch, parseUnregisteredPerformanceSearch } from "./performance-registration-preset";

describe("unregistered performance registration preset", () => {
	it("keeps every prerequisite when navigation state is unavailable", () => {
		const search = buildUnregisteredPerformanceSearch({
			serviceId: 5,
			serviceCode: "sms",
			companyId: 13,
			companyType: "CP",
			salesAgentId: 7,
			year: 1405,
			month: 2,
		}, "sms-13-1405-2");

		expect(parseUnregisteredPerformanceSearch(search)).toEqual({
			serviceId: 5,
			serviceCode: "sms",
			companyId: 13,
			companyType: "CP",
			salesAgentId: 7,
			year: 1405,
			month: 2,
		});
	});

	it("rejects an incomplete or invalid preset", () => {
		expect(parseUnregisteredPerformanceSearch("?source=unregistered&service_id=5")).toBeNull();
		expect(parseUnregisteredPerformanceSearch("?source=unregistered&service_id=5&service_code=sms&company_id=13&sh_year=1405&sh_month=13")).toBeNull();
	});
});
