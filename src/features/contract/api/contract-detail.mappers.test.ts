import { describe, expect, it } from "vitest";
import { formValuesToApiPayload } from "../shared/model/contract.payload";
import { contractDetailToFormValues } from "./contract-detail.mappers";

const base = { id: 9, service: 4, company: 7, start_jy: 1405, start_jm: 1, end_jy: 1405, end_jm: 12, contract_number: "C", note: "" };
const pricing = (amount: string) => ({ calculation_type: "FLAT", tiers: [{ rate_per_unit: amount }] });

describe("contractDetailToFormValues", () => {
	it("loads sales-agency addenda and saves them back with ids and snake_case keys", () => {
		const outbound = contractDetailToFormValues({
			...base,
			service_code: "sales_agency",
			revenue_percent: "10",
			cost_percent: "5",
			addenda: [{ id: 21, start_jy: 1405, start_jm: 2, end_jy: 1405, end_jm: 3, revenue_percent: "20.00", cost_percent: "8.00", children: [] }],
		}, "sales-agency/outbound");
		expect(outbound.serviceFields.addenda).toMatchObject([{ id: 21, incomePercentage: 20, expensePercentage: 8 }]);

		const payload = formValuesToApiPayload(outbound, 7, { mode: "edit" }) as { addenda: Array<Record<string, unknown>> };
		expect(payload.addenda[0]).toMatchObject({ id: 21, revenue_percent: "20", cost_percent: "8" });

		const rep = contractDetailToFormValues({
			...base,
			service_code: "sales_agency",
			cost_titles: ["a"],
			addenda: [{ id: 22, start_jy: 1405, start_jm: 2, end_jy: 1405, end_jm: 3, cost_titles: ["b", "c"], children: [] }],
		}, "sales-agency/rep-management");
		expect(rep.serviceFields.addenda).toMatchObject([{ id: 22, costTitles: ["b", "c"] }]);
		expect((formValuesToApiPayload(rep, 7, { mode: "edit" }) as { addenda: Array<Record<string, unknown>> }).addenda[0]).toMatchObject({ id: 22, cost_title_names: ["b", "c"] });
	});

	it("reads separated openapi shares nested under the receipt registers, per addendum", () => {
		const details = {
			contract_model: "LEGACY_2",
			wallet_charge_discount_percent: "10",
			bill_inquiry_midterm: pricing("1"),
			bill_inquiry_endterm: pricing("2"),
			receipt_register_connected: { ...pricing("3"), karashab_share_percent: "60", partner_share_percent: "40" },
			receipt_register_disconnected: { ...pricing("4"), karashab_share_percent: "70", partner_share_percent: "30" },
		};
		const values = contractDetailToFormValues({
			...base,
			service_code: "openapi",
			contract_openapi_details: details,
			addenda: [
				{ id: 31, start_jy: 1405, start_jm: 2, end_jy: 1405, end_jm: 3, contract_openapi_details: details, children: [] },
				{ id: 32, start_jy: 1405, start_jm: 4, end_jy: 1405, end_jm: 5, contract_openapi_details: { contract_model: "LEGACY", bill_inquiry: pricing("5"), receipt_register: pricing("6") }, children: [] },
			],
		}, "openapi");

		expect(values.serviceFields.contractModel).toBe("separated");
		expect(values.serviceFields.separatedPricing).toMatchObject({ walletChargeDiscountPercent: 10, connectedKarashabSharePercent: 60, connectedPartnerSharePercent: 40, disconnectedKarashabSharePercent: 70 });
		expect(values.serviceFields.addenda).toMatchObject([{ id: 31, contractModel: "separated" }, { id: 32, contractModel: "legacy" }]);

		const payload = formValuesToApiPayload(values, 7, { mode: "edit" }) as { addenda: Array<{ contract_openapi_details: Record<string, unknown> }> };
		expect(payload.addenda[0].contract_openapi_details).toMatchObject({ contract_model: "LEGACY_2", receipt_register_connected: { karashab_share_percent: "60" } });
		expect(payload.addenda[1].contract_openapi_details).toMatchObject({ contract_model: "LEGACY" });
	});

	it("keeps an unofficial traffic contract's locations and inverts based_tire", () => {
		const unofficial = contractDetailToFormValues({
			...base,
			service_code: "traffic",
			company_type: "CP",
			is_official: false,
			locations: [{ location: "TEHRAN", unit: "GB/month" }, { location: "COUNTY", unit: "GB/month" }],
			addenda: [],
		}, "traffic");
		expect(unofficial.serviceFields).toMatchObject({ isOfficial: false, tehranEnabled: true, provinceEnabled: true });
		expect((formValuesToApiPayload(unofficial, 7, { mode: "edit" }) as { locations: unknown[] }).locations).toEqual([
			{ location: "TEHRAN", unit: "GB/month" },
			{ location: "COUNTY", unit: "GB/month" },
		]);
		expect(formValuesToApiPayload(unofficial, 7, { mode: "edit" })).not.toHaveProperty("is_signed");

		const ixp = contractDetailToFormValues({
			...base,
			service_code: "traffic",
			company_type: "IXP",
			is_official: true,
			locations: [{ location: "TEHRAN", unit: "Mbps", ...pricing("1"), based_tire: true, contract_model: "LEGACY" }],
			addenda: [],
		}, "traffic");
		expect(ixp.serviceFields.tehranBasedTire).toBe(false);
	});

	it("loads collocation partners (mode, SLA, datacenters, counterparty) and the telecom cost contract", () => {
		const partners = contractDetailToFormValues({
			...base,
			service_code: "traffic",
			company_type: "COLLOCATION",
			collocation_mode: "CP",
			sla: { id: "GOLD", name: "طلایی", availability_percent: "99.60" },
			is_official: true,
			locations: [{ datacenter: { id: 3 }, collocation_mode: "CP", items: { ip: { tiers: { rate_per_unit: "5" } }, rack: { tiers: { rack_items: [{ rack_type: "full", count: 1, price: "9", free_ampere_threshold: "16.00" }] } } } }],
			addenda: [{ id: 9, sla: { id: "BRONZE", name: "برنز" }, locations: [] }],
		}, "traffic");
		expect(partners.counterpartyType).toBe("partners");
		expect(partners.serviceFields).toMatchObject({ collocationPartnerType: "CP", sla: "GOLD", datacenters: [{ datacenter: "3", ipRate: 5, electricityExemptionThreshold: 16 }] });
		expect((partners.serviceFields.addenda as Array<{ sla: unknown }>)[0].sla).toBe("BRONZE");

		const cost = contractDetailToFormValues({
			...base,
			service_code: "traffic",
			company_type: "COLLOCATION",
			locations: [{ location: "GLOBAL_COLLOCATION_COST", rack_count: "2", units_per_rack: 42, tiers: { cost_per_month: "10" } }],
			addenda: [],
		}, "traffic");
		expect(cost.counterpartyType).toBe("gov_ops");
		expect(cost.serviceFields).toMatchObject({ telecomRackCount: 2, telecomMonthlyRackRent: 10 });
	});

	it("loads only the active SMS party fields so a vendor stays valid", () => {
		const vendor = contractDetailToFormValues({
			...base,
			service_code: "sms",
			operator_rates: [{ operator: "MCI", language: "EN", ...pricing("1") }],
			government_rate: pricing("2"),
			addenda: [{ id: 5, start_jy: 1405, start_jm: 2, end_jy: 1405, end_jm: 3, operator_rates: [], government_rate: pricing("3"), children: [] }],
		}, "sms/vendor");
		expect(vendor.counterpartyType).toBe("gov_ops");
		expect(vendor.serviceFields).not.toHaveProperty("governmentRevenue");
		expect(vendor.serviceFields).not.toHaveProperty("profit");
		expect((vendor.serviceFields.addenda as Array<Record<string, unknown>>)[0]).not.toHaveProperty("governmentRevenue");
	});

	it("loads real start for every service and derives the shahkar new customer flag from the rate", () => {
		const shahkar = contractDetailToFormValues({
			...base,
			service_code: "shahkar",
			...pricing("5"),
			new_customer_calculation_type: "FLAT",
			new_customer_tiers: [{ rate_per_unit: "2" }],
			real_start: { real_start_jy: 1403, real_start_jm: 6 },
			addenda: [],
		}, "shahkar");
		expect(shahkar.serviceFields).toMatchObject({ realStartYear: 1403, realStartMonth: 6, hasNewCustomerRate: true });

		const openapi = contractDetailToFormValues({ ...base, service_code: "openapi", real_start: { real_start_jy: 1402, real_start_jm: 1 }, contract_openapi_details: { contract_model: "PACKAGE", package_model: { mode: "OR", tiers: [{ sms_min_inclusive: 0, sms_max_exclusive: 10, sms_sale_rate: { tiers: [{ rate_per_unit: "4" }] } }] } }, addenda: [] }, "openapi");
		expect(openapi.serviceFields).toMatchObject({ contractModel: "package", realStartYear: 1402, packageMode: "OR", plans: [{ smsMax: 10, smsFixedPrice: 4 }] });
	});
});
