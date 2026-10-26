import type { PerformanceFormValues } from "../../shared/model/performance.form.types";
import { describe, expect, it, vi } from "vitest";
import { upsertPerformance } from "../../api/performances.api";
import { submitPerformance } from "./performance.submit";

vi.mock("../../api/performances.api", () => ({
	upsertPerformance: vi.fn().mockResolvedValue({ id: 1 }),
	uploadPerformanceFiles: vi.fn(),
}));

const base: PerformanceFormValues = {
	serviceId: 4,
	serviceCode: "openapi",
	companyId: 10,
	companyType: null,
	salesAgentId: null,
	year: 1405,
	month: 2,
	contractId: 1,
	contractModel: "legacy_2",
	serviceFields: {},
};

describe("submitPerformance", () => {
	it("sends the four separated operations and the wallet flag for legacy_2", async () => {
		await submitPerformance({
			...base,
			serviceFields: {
				billInquiryMidtermValue: 1.5,
				billInquiryEndtermValue: 2,
				receiptRegisterConnectedValue: 3,
				receiptRegisterDisconnectedValue: 4,
				walletWasCharged: true,
				billInquiryValue: 99,
			},
		});
		expect(upsertPerformance).toHaveBeenLastCalledWith(expect.objectContaining({
			service: "openapi",
			payload: {
				company: 10,
				service: 4,
				sh_year: 1405,
				sh_month: 2,
				bill_inquiry_midterm_value: 1.5,
				bill_inquiry_endterm_value: 2,
				receipt_register_connected_value: 3,
				receipt_register_disconnected_value: 4,
				wallet_was_charged: true,
			},
		}));
	});

	it("omits a removed traffic location and rejects when none is enabled", async () => {
		const traffic: PerformanceFormValues = {
			...base,
			serviceCode: "traffic",
			companyType: "CP",
			contractModel: null,
			serviceFields: { submitMode: "single", tehranEnabled: false, countyEnabled: true, countyValue: 5, countyValueReceive: 6, countyConversionRatio: 1.5 },
		};
		await submitPerformance(traffic);
		expect(upsertPerformance).toHaveBeenLastCalledWith(expect.objectContaining({
			payload: { company: 10, service: 4, sh_year: 1405, sh_month: 2, company_type: "CP", county_value: 5, county_value_receive: 6, county_conversion_ratio: 1.5 },
		}));

		await expect(submitPerformance({ ...traffic, serviceFields: { submitMode: "single", tehranEnabled: false, countyEnabled: false } })).rejects.toThrow();
	});
});
