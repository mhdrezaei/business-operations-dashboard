import type { ContractFormValues } from "./contract.form.types";
import { describe, expect, it, vi } from "vitest";
import { buildContractSchema } from "./contract.schema";

// registry شامل کامپوننت‌های UI است؛ این تست فقط قواعد سطح قرارداد را می‌سنجد
vi.mock("../services/registry", () => ({ serviceRegistry: {} }));

const fixed = (amount: number) => ({ type: "fixed", fixedAmount: amount, rows: [], sections: [] });

function values(overrides: Partial<ContractFormValues>): ContractFormValues {
	return {
		serviceId: 1,
		serviceCode: "traffic",
		companyId: 7,
		companyType: "CP",
		counterpartyType: null,
		startYear: 1405,
		startMonth: 1,
		endYear: 1405,
		endMonth: 6,
		contractNumber: "",
		description: "",
		documents: [],
		serviceFields: {},
		...overrides,
	};
}

function issues(input: ContractFormValues) {
	const result = buildContractSchema(input.serviceCode).safeParse(input);
	return result.success ? [] : result.error.issues.map(issue => issue.path.join("."));
}

describe("contract schema", () => {
	it("requires at least one traffic location", () => {
		expect(issues(values({ serviceFields: { isOfficial: true } }))).toContain("serviceFields.tehranPricing");
		expect(issues(values({ serviceFields: { isOfficial: false, tehranEnabled: false } }))).toContain("serviceFields.tehranPricing");
		expect(issues(values({ serviceFields: { isOfficial: false } }))).not.toContain("serviceFields.tehranPricing");
		expect(issues(values({ serviceFields: { isOfficial: true, tehranPricing: fixed(1), tehranUnit: "GB/month" } }))).not.toContain("serviceFields.tehranPricing");
	});

	it("validates the real start only when it is entered", () => {
		const trigger = { startYear: 1404, startMonth: 4, serviceFields: { isOfficial: false } };
		expect(issues(values({ ...trigger }))).not.toContain("serviceFields.realStartYear");
		expect(issues(values({ ...trigger, serviceFields: { isOfficial: false, realStartYear: 1403 } }))).toContain("serviceFields.realStartYear");
		expect(issues(values({ ...trigger, serviceFields: { isOfficial: false, realStartYear: 1404, realStartMonth: 5 } }))).toContain("serviceFields.realStartMonth");
		expect(issues(values({ serviceFields: { isOfficial: false, realStartYear: 1403, realStartMonth: 5 } }))).toContain("serviceFields.realStartYear");
	});

	it("requires an SLA for collocation business partners", () => {
		const collocation = values({
			companyType: "COLLOCATION",
			counterpartyType: "partners",
			serviceFields: { isOfficial: true, collocationPartnerType: "COLLOCATION", datacenters: [] },
		});
		expect(issues(collocation)).toContain("serviceFields.sla");
		expect(issues({ ...collocation, serviceFields: { ...collocation.serviceFields, sla: "GOLD" } })).not.toContain("serviceFields.sla");
	});

	it("requires at least one port item and one rack item per collocation datacenter", () => {
		const input = values({
			companyType: "COLLOCATION",
			counterpartyType: "partners",
			serviceFields: {
				isOfficial: true,
				sla: "GOLD",
				collocationPartnerType: "COLLOCATION",
				datacenters: [{ datacenter: "3", bandwidthUnitRate: 1, ipRate: 1, electricityAmpRate: 1, electricityExemptionThreshold: 1, portItems: [], rackItems: [] }],
			},
		});
		expect(issues(input)).toEqual(expect.arrayContaining(["serviceFields.datacenters.0.portItems", "serviceFields.datacenters.0.rackItems"]));
	});

	it("keeps the real start fields for services whose schema is not passthrough", () => {
		const input = values({ serviceCode: "shahkar", companyType: null, startYear: 1404, startMonth: 4, serviceFields: { contractPricing: { type: "fixed", fixedAmount: 1, rows: [], sections: [] }, realStartYear: 1403, realStartMonth: 5 } });
		const result = buildContractSchema("shahkar").safeParse(input);
		expect(result.success && (result.data.serviceFields as Record<string, unknown>).realStartYear).toBe(1403);
	});

	it("checks addenda against the parent range", () => {
		const input = values({
			serviceFields: {
				isOfficial: false,
				addenda: [{ startYear: 1406, startMonth: 5, endYear: 1406, endMonth: 6, children: [] }],
			},
		});
		expect(issues(input)).toContain("serviceFields.addenda.0.startYear");
	});
});
