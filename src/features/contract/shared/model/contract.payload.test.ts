import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import { describe, expect, it } from "vitest";
import { formValuesToApiPayload } from "./contract.payload";

// خروجی payload در تست‌ها برای دسترسی ساده به کلیدها تایپ ساده می‌شود
const build = (...args: Parameters<typeof formValuesToApiPayload>) => formValuesToApiPayload(...args) as Record<string, any>;

const fixed = (amount: number) => ({ type: "fixed", fixedAmount: amount, rows: [], sections: [] });
const period = { startYear: 1405, startMonth: 1, endYear: 1405, endMonth: 6 };

function values(overrides: Partial<ContractFormValues>): ContractFormValues {
	return {
		serviceId: 1,
		serviceCode: null,
		companyId: 7,
		companyType: null,
		counterpartyType: null,
		...period,
		contractNumber: "C-1",
		description: "",
		documents: [],
		serviceFields: {},
		...overrides,
	};
}

describe("sms payloads", () => {
	const operatorRevenue = { irancellFa: fixed(1), irancellEn: fixed(2), hamrahAvalFa: fixed(3), hamrahAvalEn: fixed(4), otherFa: fixed(5), otherEn: fixed(6) };

	it("sends vendor rates as operator_rates/government_rate without company or is_official", () => {
		const payload = build(values({
			serviceCode: "sms",
			counterpartyType: "gov_ops",
			companyId: null,
			serviceFields: {
				operatorRevenue,
				governmentRate: fixed(9),
				isOfficial: true,
				addenda: [{ ...period, operatorRevenue, governmentRate: fixed(8), children: [{ ...period, operatorRevenue, governmentRate: fixed(7) }] }],
			},
		}), null);

		expect(payload).not.toHaveProperty("company");
		expect(payload).not.toHaveProperty("is_official");
		expect(payload.operator_rates).toHaveLength(6);
		expect(payload.government_rate.tiers).toEqual([{ min_inclusive: null, max_exclusive: null, rate_per_unit: "9" }]);
		expect(payload.addenda).toHaveLength(1);
		expect(payload.addenda[0].operator_rates).toHaveLength(6);
		expect(payload.addenda[0].government_rate).toBeDefined();
		expect(payload.addenda[0].children).toHaveLength(1);
	});

	it("groups client addenda into one node with children kept once", () => {
		const payload = build(values({
			serviceCode: "sms",
			counterpartyType: "partners",
			companyType: "CLIENT",
			serviceFields: {
				operatorRevenue,
				governmentRevenue: fixed(9),
				profit: { pricing: fixed(1), minProfit: null },
				isOfficial: true,
				addenda: [{ ...period, operatorRevenue, governmentRevenue: fixed(8), profit: { pricing: fixed(2), minProfit: 5 }, children: [{ ...period, operatorRevenue, governmentRevenue: fixed(7), profit: { pricing: fixed(3) } }] }],
			},
		}), 7);

		expect(payload.is_official).toBe(true);
		expect(payload.profit).not.toHaveProperty("min_profit_amount");
		expect(payload.addenda).toHaveLength(1);
		expect(payload.addenda[0]).toMatchObject({ profit: { min_profit_amount: "5" } });
		expect(payload.addenda[0].operator_revenue).toHaveLength(6);
		expect(payload.addenda[0].children).toHaveLength(1);
		expect(payload.addenda[0]).not.toHaveProperty("component");
	});
});

describe("traffic payloads", () => {
	it("never marks a new contract as signed and sends real start for any service", () => {
		const payload = build(values({
			serviceCode: "traffic",
			companyType: "CP",
			startYear: 1404,
			startMonth: 4,
			serviceFields: { isOfficial: true, tehranPricing: fixed(100), tehranUnit: "GB/month", realStartYear: 1403, realStartMonth: 7 },
		}), 7);

		expect(payload.is_signed).toBe(false);
		expect(payload.is_official).toBe(true);
		expect(payload.real_start).toEqual({ real_start_jy: 1403, real_start_jm: 7 });
		expect(payload.locations).toHaveLength(1);
	});

	it("sends enabled locations with units for an unofficial contract", () => {
		const payload = build(values({
			serviceCode: "traffic",
			companyType: "IXP",
			serviceFields: { isOfficial: false, provinceEnabled: true },
		}), 7);

		expect(payload.is_official).toBe(false);
		expect(payload.locations).toEqual([
			{ location: "TEHRAN", unit: "Mbps" },
			{ location: "COUNTY", unit: "Mbps" },
		]);
	});

	it("sends sla on the contract and every location for collocation partners, and always official", () => {
		const payload = build(values({
			serviceCode: "traffic",
			companyType: "COLLOCATION",
			counterpartyType: "partners",
			serviceFields: {
				isOfficial: false,
				sla: "GOLD",
				collocationPartnerType: "COLLOCATION",
				datacenters: [{ datacenter: "3", ipRate: 5, electricityExemptionThreshold: 16, rackItems: [{ rackType: "FULL_RACK", count: 2, unitPrice: 10 }], portItems: [] }],
				addenda: [{ ...period, sla: "DIAMOND", datacenters: [{ datacenter: "3", ipRate: 6 }] }],
			},
		}), 7);

		expect(payload.is_official).toBe(true);
		expect(payload.sla).toBe("GOLD");
		expect(payload.locations.every((location: any) => location.sla === "GOLD")).toBe(true);
		expect(payload.locations.find((location: any) => location.location === "GLOBAL_RACK").rack_items[0]).toMatchObject({ rack_type: "full", free_ampere_threshold: 16 });
		// همه ۵ دسته همیشه ارسال می‌شود و نرخ خالی ۰ است (مثل old)
		expect(payload.addenda[0].locations.map((location: any) => location.location)).toEqual(["GLOBAL_IP", "GLOBAL_PORT", "GLOBAL_BANDWIDTH", "GLOBAL_AMPERE", "GLOBAL_RACK"]);
		expect(payload.addenda[0].locations[0]).toMatchObject({ sla: "DIAMOND", datacenter: 3, tiers: { rate_per_unit: 6 } });
		expect(payload.addenda[0].locations[2].tiers).toEqual({ rate_per_unit: 0 });
	});

	it("maps telecom collocation addenda to the rack cost location with the default units per rack", () => {
		const payload = build(values({
			serviceCode: "traffic",
			companyType: "COLLOCATION",
			counterpartyType: "gov_ops",
			serviceFields: {
				telecomRackCount: 2,
				telecomUnitsPerRack: 42,
				telecomMonthlyRackRent: 1000,
				addenda: [{ ...period, telecomRackCount: 3, telecomMonthlyRackRent: 2000 }],
			},
		}), 7);

		expect(payload.addenda[0].locations).toEqual([{
			location: "GLOBAL_COLLOCATION_COST",
			calculation_type: "FLAT",
			units_per_rack: 42,
			rack_count: "3",
			tiers: { cost_per_month: "2000" },
		}]);
	});
});

describe("collocation items", () => {
	it("always sends free_ampere_threshold on rack items, drops partly filled rows and keeps CP racks TIER_SINGLE", () => {
		const payload = build(values({
			serviceCode: "traffic",
			companyType: "COLLOCATION",
			counterpartyType: "partners",
			serviceFields: {
				sla: "GOLD",
				collocationPartnerType: "CP",
				datacenters: [{
					datacenter: "3",
					portItems: [{ count: 2, speed: 10, unitPrice: 5 }, { count: 1 }],
					rackItems: [{ rackType: "half", count: 1, unitPrice: 9 }, { rackType: "full" }],
				}],
			},
		}), 7);

		const rack = payload.locations.find((location: any) => location.location === "GLOBAL_RACK");
		expect(rack.rack_items).toEqual([{ rack_type: "half", count: 1, price: "9", free_ampere_threshold: 0 }]);
		expect(rack.calculation_type).toBe("TIER_SINGLE");
		expect(payload.locations.find((location: any) => location.location === "GLOBAL_PORT").port_items).toEqual([{ count: 2, speed: 10, price: "5" }]);
	});
});

describe("openapi payloads", () => {
	const separated = {
		walletChargeDiscountPercent: 10,
		midPeriodBillInquiry: fixed(1),
		endPeriodBillInquiry: fixed(2),
		connectedReceiptRegister: fixed(3),
		connectedKarashabSharePercent: 60,
		connectedPartnerSharePercent: 40,
		disconnectedReceiptRegister: fixed(4),
		disconnectedKarashabSharePercent: 70,
		disconnectedPartnerSharePercent: 30,
	};

	it("maps each addendum with its own contract model", () => {
		const payload = build(values({
			serviceCode: "openapi",
			serviceFields: {
				contractModel: "legacy",
				legacyPricing: { paymentRegistration: fixed(1), billInquiry: fixed(2) },
				addenda: [
					{ ...period, contractModel: "separated", separatedPricing: separated },
					{ ...period, contractModel: "legacy", legacyPricing: { paymentRegistration: fixed(5), billInquiry: fixed(6) } },
				],
			},
		}), 7);

		expect(payload.addenda[0].contract_openapi_details).toMatchObject({
			contract_model: "LEGACY_2",
			wallet_charge_discount_percent: "10",
			receipt_register_connected: { karashab_share_percent: "60", partner_share_percent: "40" },
		});
		expect(payload.addenda[1].contract_openapi_details).toMatchObject({ contract_model: "LEGACY" });
		expect(payload.addenda[1].contract_openapi_details.receipt_register.tiers[0].rate_per_unit).toBe("5");
	});
});

describe("sales agency payloads", () => {
	it("maps outbound addenda percents and rep-management cost titles", () => {
		const outbound = build(values({
			serviceCode: "sales_agency",
			companyType: "OUTBOUND",
			serviceFields: { incomePercentage: 10, expensePercentage: 5, addenda: [{ ...period, incomePercentage: 20, expensePercentage: 8 }] },
		}), 7);
		expect(outbound.addenda[0]).toMatchObject({ revenue_percent: "20", cost_percent: "8" });

		const rep = build(values({
			serviceCode: "sales_agency",
			companyType: "SALES_REP_MANAGEMENT",
			serviceFields: { costTitles: ["a"], addenda: [{ ...period, costTitles: [" b ", ""] }, { ...period, costTitles: [] }] },
		}), 7);
		expect(rep.cost_title_names).toEqual(["a"]);
		expect(rep.addenda[0].cost_title_names).toEqual(["b"]);
		expect(rep.addenda[1]).not.toHaveProperty("cost_title_names");
	});
});

describe("edit mode", () => {
	const edit = { mode: "edit" } as const;
	const shahkarValues = (serviceFields: Record<string, unknown>) => values({ serviceCode: "shahkar", startYear: 1404, startMonth: 4, serviceFields: { contractPricing: fixed(5), ...serviceFields } });

	it("never touches the main signature on edit but always sends false on create", () => {
		expect(build(shahkarValues({}), 7, edit)).not.toHaveProperty("is_signed");
		expect(build(shahkarValues({}), 7)).toMatchObject({ is_signed: false });
		expect(build(values({ serviceCode: "psp", companyType: "IPG" }), 7, edit)).not.toHaveProperty("is_signed");
	});

	it("creates addenda of every service (nested too) with is_signed=false and leaves them alone on edit", () => {
		const addenda = [{ ...period, children: [{ ...period }] }];
		const openapi = values({ serviceCode: "openapi", serviceFields: { contractModel: "legacy", contractPricing: fixed(5), addenda } });
		expect(build(openapi, 7).addenda[0]).toMatchObject({ is_signed: false, children: [{ is_signed: false }] });
		expect(build(openapi, 7, edit).addenda[0]).not.toHaveProperty("is_signed");
	});

	it("sends real_start for every service and clears it with null on edit", () => {
		const fields = { realStartYear: 1403, realStartMonth: 6 };
		expect(build(shahkarValues(fields), 7)).toMatchObject({ real_start: { real_start_jy: 1403, real_start_jm: 6 } });
		expect(build(values({ serviceCode: "openapi", startYear: 1404, startMonth: 4, serviceFields: { contractModel: "legacy", ...fields } }), 7, edit)).toMatchObject({ real_start: { real_start_jy: 1403 } });
		expect(build(shahkarValues({}), 7, { mode: "edit", hadRealStart: true })).toMatchObject({ real_start: null });
		expect(build(shahkarValues({}), 7, edit)).not.toHaveProperty("real_start");
		expect(build(shahkarValues({}), 7)).not.toHaveProperty("real_start");
	});

	it("clears the new customer rate with explicit nulls only on edit", () => {
		expect(build(shahkarValues({ hasNewCustomerRate: false }), 7, edit)).toMatchObject({ new_customer_calculation_type: null, new_customer_tiers: null });
		expect(build(shahkarValues({ hasNewCustomerRate: false }), 7)).not.toHaveProperty("new_customer_tiers");
		expect(build(shahkarValues({ hasNewCustomerRate: true, newCustomerPricing: fixed(2) }), 7, edit)).toMatchObject({ new_customer_calculation_type: "FLAT" });
	});

	it("round-trips package contracts and whitelists PSP fields", () => {
		const pkg = build(values({
			serviceCode: "openapi",
			serviceFields: { contractModel: "package", packageMode: "OR", plans: [{ smsMin: 0, smsMax: 10, billFixedPrice: 3 }] },
		}), 7, edit);
		expect(pkg.openapi_model).toBe("PACKAGE");
		expect(pkg.contract_openapi_details).toMatchObject({ contract_model: "PACKAGE", package_model: { mode: "OR", tiers: [{ sms_max_exclusive: 10 }] } });

		const psp = build(values({ serviceCode: "psp", companyType: "IPG", serviceFields: { is_business_approved: true, real_signed_at: "x" } }), 7, edit);
		expect(psp).not.toHaveProperty("is_business_approved");
		expect(psp).not.toHaveProperty("real_signed_at");
	});

	it("omits addenda for an unofficial traffic contract", () => {
		const payload = build(values({ serviceCode: "traffic", companyType: "CP", serviceFields: { isOfficial: false, addenda: [{ ...period }] } }), 7, edit);
		expect(payload).not.toHaveProperty("addenda");
	});
});
