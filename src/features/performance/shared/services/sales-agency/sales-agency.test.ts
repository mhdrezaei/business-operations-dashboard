import type { AccessServiceType } from "#src/api/user/types";
import type { PerformanceContractListItem } from "#src/features/performance/api/performances.api";
import { upsertPerformance } from "#src/features/performance/api/performances.api";
import { submitPerformance } from "#src/features/performance/create/ui/performance.submit";
import { getPermittedCompanyTypesForDomain } from "#src/utils/access-policy";
import { describe, expect, it, vi } from "vitest";
import { companyTypeMatches, isContractActiveInPeriod, resolveContractServicePath, resolvePerformanceServicePath } from "../../model/performance.helpers";
import { salesAgencyCostTitles } from "./sales-agency.helpers";
import { salesAgencyFieldsSchema } from "./sales-agency.schema";

vi.mock("#src/features/performance/api/performances.api", () => ({
	upsertPerformance: vi.fn().mockResolvedValue({ id: 42 }),
	uploadPerformanceFiles: vi.fn(),
}));

describe("sales agency performance", () => {
	it("offers the two cooperation types while preserving explicit access restrictions", () => {
		const service = { id: 8, code: "sales_agency", name: "عاملیت فروش", permissions: { performances: { create: true, view: true, update: true, delete: false } } } as AccessServiceType;
		expect(getPermittedCompanyTypesForDomain([service], "performances", "create", 8).map(item => item.key)).toEqual(["SALES_REP_MANAGEMENT", "OUTBOUND"]);
		const restricted = { ...service, company_type_permissions: { performances: { create: [] } } };
		expect(getPermittedCompanyTypesForDomain([restricted], "performances", "create", 8)).toEqual([]);
	});

	it("requires a cooperation type before selecting an endpoint", () => {
		expect(resolvePerformanceServicePath("sales_agency")).toBeNull();
		expect(resolvePerformanceServicePath("sales_agency", "OUTBOUND")).toBe("sales-agency/outbound");
		expect(resolveContractServicePath("sales_agency", "SALES_REP_MANAGEMENT")).toBe("sales-agency/rep-management");
		expect(companyTypeMatches({ OUTBOUND: "فروش Outbound" }, "SALES_REP_MANAGEMENT")).toBe(false);
		expect(companyTypeMatches({ OUTBOUND: "فروش Outbound" }, "OUTBOUND")).toBe(true);
	});

	it("uses contract and nested addendum titles only for their active period", () => {
		const contract = { id: 1, company: 10, service: 8, start_jy: 1405, start_jm: 1, end_jy: 1405, end_jm: 3, cost_titles: ["base"], addenda: [{ start_jy: 1405, start_jm: 4, end_jy: 1405, end_jm: 6, cost_title_names: ["extension"] }] } as PerformanceContractListItem;
		expect(salesAgencyCostTitles([contract], 1405, 2)).toEqual(["base"]);
		expect(salesAgencyCostTitles([contract], 1405, 4)).toEqual(["extension"]);
		expect(isContractActiveInPeriod(contract, 1405, 4)).toBe(true);
		expect(salesAgencyCostTitles([contract], 1405, 7)).toEqual([]);
	});

	it("rejects missing and negative amounts but accepts zero", () => {
		const outbound = salesAgencyFieldsSchema("OUTBOUND");
		expect(outbound.safeParse({ total_sales: "" }).success).toBe(false);
		expect(outbound.safeParse({ total_sales: -1 }).success).toBe(false);
		expect(outbound.safeParse({ total_sales: 0 }).success).toBe(true);
		const representatives = salesAgencyFieldsSchema("SALES_REP_MANAGEMENT");
		expect(representatives.safeParse({ credit_total: 0, income: 0, cost_items: [] }).success).toBe(false);
		expect(representatives.safeParse({ credit_total: 0, income: 0, cost_items: [{ cost_title: "هزینه", amount: 0 }] }).success).toBe(true);
	});

	it.each([
		["OUTBOUND", "sales-agency/outbound", { total_sales: 120 }],
		["SALES_REP_MANAGEMENT", "sales-agency/rep-management", { credit_total: 100, income: 50, cost_items: [{ cost_title: "هزینه", amount: 20 }] }],
	] as const)("submits %s to its own endpoint with only its fields", async (companyType, service, fields) => {
		await submitPerformance({ serviceCode: "sales_agency", serviceId: 8, companyId: 10, companyType, year: 1405, month: 2, contractId: 1, contractModel: null, salesAgentId: null, serviceFields: { ...fields, unrelated: 999 } });
		expect(upsertPerformance).toHaveBeenLastCalledWith(expect.objectContaining({ service, payload: { company: 10, service: 8, sh_year: 1405, sh_month: 2, company_type: companyType, ...fields } }));
	});
});
