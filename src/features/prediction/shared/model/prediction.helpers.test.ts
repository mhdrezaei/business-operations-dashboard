import { describe, expect, it } from "vitest";
import { isAvailablePredictionCompanyType, isSupportedPredictionService, pickQuarterFields, PREDICTION_FISCAL_YEAR_OPTIONS } from "./prediction.helpers";

describe("prediction availability", () => {
	it("only exposes services implemented by the prediction registry", () => {
		expect(isSupportedPredictionService("sms")).toBe(true);
		expect(isSupportedPredictionService(" TRAFFIC ")).toBe(true);
		expect(isSupportedPredictionService("sms-commission")).toBe(false);
		expect(isSupportedPredictionService("commercial")).toBe(false);
	});

	it("limits PSP to IPG and keeps every other company type", () => {
		expect(isAvailablePredictionCompanyType("psp", "IPG")).toBe(true);
		expect(isAvailablePredictionCompanyType(" PSP ", " ipg ")).toBe(true);
		expect(isAvailablePredictionCompanyType("psp", "CP")).toBe(false);
		expect(isAvailablePredictionCompanyType("traffic", "COLLOCATION")).toBe(true);
		expect(isAvailablePredictionCompanyType("sms", "COLLOCATION")).toBe(true);
	});

	it("offers the fixed fiscal years 1404..1409", () => {
		expect(PREDICTION_FISCAL_YEAR_OPTIONS.map(option => option.value)).toEqual([1404, 1405, 1406, 1407, 1408, 1409]);
	});
});

describe("pickQuarterFields", () => {
	it("keeps the quarters and drops everything else", () => {
		expect(pickQuarterFields({ q1Percent: 10, q3Percent: 40, valueYear: 5 })).toEqual({
			q1Percent: 10,
			q2Percent: null,
			q3Percent: 40,
			q4Percent: null,
		});
		expect(pickQuarterFields(undefined).q1Percent).toBeNull();
	});
});
