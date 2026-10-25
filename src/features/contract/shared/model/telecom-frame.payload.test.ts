import { describe, expect, it } from "vitest";
import { resolveContractServicePath } from "./contract-service-path";
import { formValuesToApiPayload } from "./contract.payload";
import { mapTelecomFrameAddenda, mapTelecomFrameContractTypes, mapTelecomFramePayload } from "./telecom-frame.payload";

// خروجی payload در تست‌ها برای دسترسی ساده به کلیدها تایپ ساده می‌شود
const build = (...args: Parameters<typeof formValuesToApiPayload>) => formValuesToApiPayload(...args) as Record<string, any>;

const contractTypes = [
	{ contractType: "DEVELOPMENT", revenue: 1500000, manHours: 120 },
	{ contractType: "SUPPORT", revenue: 200, manHours: null },
];

describe("telecom frame payload", () => {
	it("maps contract types to the old backend shape", () => {
		expect(mapTelecomFrameContractTypes([...contractTypes, { contractType: "", revenue: 1 }])).toEqual([
			{ contract_type: "DEVELOPMENT", revenue: "1500000", man_hours: 120 },
			{ contract_type: "SUPPORT", revenue: "200", man_hours: 0 },
		]);
	});

	it("sends penalty only when enabled and the timeline only when it has rows", () => {
		const withoutPenalty = mapTelecomFramePayload({ contractTypes, hasPenalty: false, penalty: { initialGraceDays: 1 } });
		expect(withoutPenalty.penalty).toBeNull();
		expect(withoutPenalty).not.toHaveProperty("status_timeline");

		const full = mapTelecomFramePayload({
			contractTypes,
			boPersonIds: ["3", 4],
			poPersonIds: [5],
			hasPenalty: true,
			penalty: { initialGraceDays: 10, toleranceDays: 5, penaltyPercent: 2.5 },
			statusTimeline: [
				{ status: "SUSPENDED", startDate: "2026-01-01", endDateExclusive: "2026-02-01", note: "x" },
				{ status: "ACTIVE", startDate: "", endDateExclusive: "2026-03-01", note: "" },
			],
		});
		expect(full.bo_person_ids).toEqual([3, 4]);
		expect(full.po_person_ids).toEqual([5]);
		expect(full.penalty).toEqual({ initial_grace_days: 10, tolerance_days: 5, penalty_percent: "2.5" });
		expect(full.status_timeline).toEqual([
			{ status: "SUSPENDED", start_date: "2026-01-01", end_date_exclusive: "2026-02-01", note: "x" },
		]);
	});

	it("maps addenda to period fields plus contract_types, keeping children", () => {
		expect(mapTelecomFrameAddenda([{
			startYear: 1404,
			startMonth: 1,
			endYear: 1404,
			endMonth: 3,
			contractNumber: "A-1",
			description: "n",
			contractTypes: [contractTypes[0]],
			children: [{ startYear: 1404, startMonth: 2, endYear: 1404, endMonth: 3, contractTypes: [contractTypes[1]] }],
		}])).toEqual([{
			start_jy: 1404,
			start_jm: 1,
			end_jy: 1404,
			end_jm: 3,
			note: "n",
			is_signed: false,
			is_business_approved: false,
			contract_number: "A-1",
			contract_types: [{ contract_type: "DEVELOPMENT", revenue: "1500000", man_hours: 120 }],
			children: [{
				start_jy: 1404,
				start_jm: 2,
				end_jy: 1404,
				end_jm: 3,
				note: "",
				is_signed: false,
				is_business_approved: false,
				contract_number: "",
				contract_types: [{ contract_type: "SUPPORT", revenue: "200", man_hours: 0 }],
				children: [],
			}],
		}]);
	});

	it("routes telecom_frame to contracts/telecom-frame/ with the base fields", () => {
		const values = {
			serviceId: 9,
			serviceCode: "telecom_frame",
			companyId: 4,
			companyType: "IT",
			counterpartyType: null,
			startYear: 1404,
			startMonth: 1,
			endYear: 1404,
			endMonth: 12,
			contractNumber: "C-1",
			documents: [],
			serviceFields: { contractTypes, addenda: [] },
		} as const;
		expect(resolveContractServicePath(values as never)).toBe("telecom-frame");
		expect(build(values as never, 4)).toMatchObject({
			service: 9,
			company: 4,
			company_type: "IT",
			contract_number: "C-1",
			contract_types: [expect.objectContaining({ contract_type: "DEVELOPMENT" }), expect.anything()],
			addenda: [],
		});
	});
});
