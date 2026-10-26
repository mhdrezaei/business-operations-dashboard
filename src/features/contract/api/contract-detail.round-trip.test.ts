import { describe, expect, it } from "vitest";
import { formValuesToApiPayload } from "../shared/model/contract.payload";
import { openApiServiceFieldsSchema } from "../shared/services/openapi/openapi.schema";
import { telecomFrameServiceFieldsSchema } from "../shared/services/telecom-frame/telecom-frame.schema";
import { contractDetailToFormValues } from "./contract-detail.mappers";

const base = { id: 9, service: 4, company: 7, start_jy: 1405, start_jm: 1, end_jy: 1405, end_jm: 12, contract_number: "C", note: "" };
const flat = (amount: string) => ({ calculation_type: "FLAT", tiers: [{ min_inclusive: null, max_exclusive: null, rate_per_unit: amount }] });

describe("contract edit round trip (DTO → form → zod → edit payload)", () => {
	it("loads a telecom frame contract and saves it back without touching signing flags", () => {
		const values = contractDetailToFormValues({
			...base,
			service_code: "telecom_frame",
			company_type: "TELECOM",
			contract_types: [{ contract_type: "SUPPORT", revenue: "200.00", man_hours: 5 }],
			bo_person_ids: [3, "4"],
			po_person_ids: [5],
			penalty: { initial_grace_days: 10, tolerance_days: 5, penalty_percent: "2.50" },
			status_timeline: [{ id: 8, status: "SUSPENDED", start_date: "2026-01-01", end_date_exclusive: "2026-02-01", note: "n" }],
			addenda: [{ id: 31, start_jy: 1405, start_jm: 2, end_jy: 1405, end_jm: 3, contract_types: [{ contract_type: "UPDATE", revenue: "50", man_hours: 0 }], children: [] }],
		}, "telecom-frame");

		expect(values.serviceFields).toMatchObject({
			contractTypes: [{ contractType: "SUPPORT", revenue: 200, manHours: 5 }],
			boPersonIds: [3, 4],
			hasPenalty: true,
			penalty: { initialGraceDays: 10, toleranceDays: 5, penaltyPercent: 2.5 },
			statusTimeline: [{ id: 8, status: "SUSPENDED", startDate: "2026-01-01", endDateExclusive: "2026-02-01" }],
			addenda: [{ id: 31, contractTypes: [{ contractType: "UPDATE", revenue: 50, manHours: 0 }] }],
		});
		expect(telecomFrameServiceFieldsSchema.safeParse(values.serviceFields).success).toBe(true);

		const payload = formValuesToApiPayload(values, 7, { mode: "edit" }) as Record<string, any>;
		expect(payload).not.toHaveProperty("is_signed");
		expect(payload).not.toHaveProperty("is_business_approved");
		expect(payload.contract_types).toEqual([{ contract_type: "SUPPORT", revenue: "200", man_hours: 5 }]);
		expect(payload.penalty).toEqual({ initial_grace_days: 10, tolerance_days: 5, penalty_percent: "2.5" });
		expect(payload.status_timeline[0]).toMatchObject({ id: 8, status: "SUSPENDED" });
		expect(payload.addenda[0]).toMatchObject({ id: 31, contract_types: [{ contract_type: "UPDATE", revenue: "50", man_hours: 0 }] });
		expect(payload.addenda[0]).not.toHaveProperty("is_signed");

		const created = formValuesToApiPayload(values, 7, { mode: "create" }) as Record<string, unknown>;
		expect(created).toMatchObject({ is_signed: false, is_business_approved: false });
	});

	it("loads an openapi package contract into the plans editor and validates/saves it", () => {
		const values = contractDetailToFormValues({
			...base,
			service_code: "openapi",
			openapi_model: "PACKAGE",
			contract_openapi_details: {
				contract_model: "PACKAGE",
				package_model: {
					mode: "AND",
					tiers: [
						{ sms_min_inclusive: 0, sms_max_exclusive: 100, bill_min_inclusive: 0, bill_max_exclusive: 10, partner_share_percent: "40", karashab_share_percent: "60", traffic_profit_percent: "5", traffic_partner_share_percent: "4", sms_sale_rate: flat("7"), bill_inquiry_rate: flat("8") },
						{ sms_min_inclusive: 100, sms_max_exclusive: null, bill_min_inclusive: 10, bill_max_exclusive: null, partner_share_percent: "50", karashab_share_percent: "50", traffic_profit_percent: "6", traffic_partner_share_percent: "3", sms_sale_rate: flat("6"), bill_inquiry_rate: flat("7") },
					],
				},
			},
		}, "openapi");

		expect(values.serviceFields).toMatchObject({ contractModel: "package", packageMode: "AND" });
		expect((values.serviceFields.plans as unknown[]).length).toBe(2);
		const parsed = openApiServiceFieldsSchema.safeParse(values.serviceFields);
		expect(parsed.success).toBe(true);

		const payload = formValuesToApiPayload(values, 7, { mode: "edit" }) as Record<string, any>;
		expect(payload.openapi_model).toBe("PACKAGE");
		expect(payload.contract_openapi_details.package_model.mode).toBe("AND");
		expect(payload.contract_openapi_details.package_model.tiers[1]).toMatchObject({
			sms_min_inclusive: 100,
			sms_max_exclusive: null,
			partner_share_percent: "50",
			sms_sale_rate: { calculation_type: "FLAT", tiers: [{ rate_per_unit: "6" }] },
		});
	});

	it("rejects package plans with broken shares or non-continuous ranges", () => {
		const plan = { smsMin: 0, smsMax: 100, smsFixedPrice: 1, billMin: 0, billMax: 10, billFixedPrice: 1, billPartnerShare: 40, billKarashabShare: 50, trafficProfitPercent: 5, trafficPartnerSharePercent: 4 };
		const result = openApiServiceFieldsSchema.safeParse({
			contractModel: "package",
			packageMode: "OR",
			plans: [plan, { ...plan, billKarashabShare: 60, smsMin: 5 }],
		});
		expect(result.success).toBe(false);
		const paths = (result.error?.issues ?? []).map(issue => issue.path.join("."));
		expect(paths).toContain("plans.0.billKarashabShare");
		expect(paths).toContain("plans.1.smsMin");
	});

	it("round-trips a package addendum (plans editor) with its id", () => {
		const tier = { sms_min_inclusive: 0, sms_max_exclusive: null, bill_min_inclusive: 0, bill_max_exclusive: null, partner_share_percent: "40", karashab_share_percent: "60", traffic_profit_percent: "5", traffic_partner_share_percent: "4", sms_sale_rate: flat("7"), bill_inquiry_rate: flat("8") };
		const details = { contract_model: "PACKAGE", package_model: { mode: "OR", tiers: [tier] } };
		const values = contractDetailToFormValues({
			...base,
			service_code: "openapi",
			openapi_model: "PACKAGE",
			contract_openapi_details: details,
			addenda: [{ id: 31, start_jy: 1405, start_jm: 2, end_jy: 1405, end_jm: 3, contract_openapi_details: { ...details, package_model: { mode: "AND", tiers: [tier] } } }],
		}, "openapi");

		const addendum = (values.serviceFields.addenda as Array<Record<string, unknown>>)[0];
		expect(addendum).toMatchObject({ id: 31, contractModel: "package", packageMode: "AND" });
		expect(openApiServiceFieldsSchema.safeParse(values.serviceFields).success).toBe(true);

		const payload = formValuesToApiPayload(values, 7, { mode: "edit" }) as Record<string, any>;
		expect(payload.addenda[0]).toMatchObject({ id: 31, contract_openapi_details: { contract_model: "PACKAGE", package_model: { mode: "AND" } } });
		expect(payload.addenda[0].contract_openapi_details.package_model.tiers[0]).toMatchObject({ partner_share_percent: "40", sms_sale_rate: { tiers: [{ rate_per_unit: "7" }] } });
	});

	it("rejects a package addendum with broken plans", () => {
		const result = openApiServiceFieldsSchema.safeParse({
			contractModel: "package",
			packageMode: "OR",
			plans: [],
			addenda: [{ startYear: 1405, startMonth: 1, endYear: 1405, endMonth: 2, contractModel: "package", packageMode: null, plans: [{ smsMin: 0, smsMax: null, billMin: 0, billMax: null }] }],
		});
		const paths = (result.error?.issues ?? []).map(issue => issue.path.join("."));
		expect(paths).toContain("addenda.0.packageMode");
		expect(paths).toContain("addenda.0.plans.0.smsFixedPrice");
	});

	it("keeps shahkar addendum ids, never sends is_signed on edit and clears a removed new-customer rate", () => {
		const values = contractDetailToFormValues({
			...base,
			service_code: "shahkar",
			addenda: [{ id: 5, start_jy: 1405, start_jm: 2, end_jy: 1405, end_jm: 3, is_signed: true, ...flat("3"), new_customer_calculation_type: "FLAT", new_customer_tiers: flat("2").tiers }],
		}, "shahkar");
		const loaded = (values.serviceFields.addenda as Array<Record<string, unknown>>)[0];
		expect(loaded).toMatchObject({ id: 5, hasNewCustomerRate: true });

		(values.serviceFields.addenda as Array<Record<string, unknown>>)[0].hasNewCustomerRate = false;
		const edit = formValuesToApiPayload(values, 7, { mode: "edit" }) as Record<string, any>;
		expect(edit.addenda[0]).toMatchObject({ id: 5, new_customer_calculation_type: null, new_customer_tiers: null });
		expect(edit.addenda[0]).not.toHaveProperty("is_signed");
		const create = formValuesToApiPayload(values, 7, { mode: "create" }) as Record<string, any>;
		expect(create.addenda[0]).toMatchObject({ is_signed: false });
	});

	it("reverses based_tire for IXP traffic addenda in both directions", () => {
		const location = (basedTire: boolean) => ({ location: "TEHRAN", unit: "Mbps", based_tire: basedTire, contract_model: "LEGACY", ...flat("1") });
		const values = contractDetailToFormValues({
			...base,
			service_code: "traffic",
			company_type: "IXP",
			is_official: true,
			locations: [location(true)],
			addenda: [{ id: 8, start_jy: 1405, start_jm: 2, end_jy: 1405, end_jm: 3, locations: [location(false)] }],
		}, "traffic");
		const addendum = (values.serviceFields.addenda as Array<Record<string, unknown>>)[0];
		expect(addendum.tehranBasedTire).toBe(true);
		const payload = formValuesToApiPayload(values, 7, { mode: "edit" }) as Record<string, any>;
		expect(payload.locations[0].based_tire).toBe(true);
		expect(payload.addenda[0]).toMatchObject({ id: 8 });
		expect(payload.addenda[0].locations[0].based_tire).toBe(false);
	});
});
