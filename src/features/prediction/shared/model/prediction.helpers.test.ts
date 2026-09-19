import { describe, expect, it } from "vitest";
import { isAvailablePredictionCompanyType, isSupportedPredictionService } from "./prediction.helpers";

describe("prediction availability", () => {
	it("only exposes services implemented by the prediction registry", () => {
		expect(isSupportedPredictionService("sms")).toBe(true);
		expect(isSupportedPredictionService(" TRAFFIC ")).toBe(true);
		expect(isSupportedPredictionService("sms-commission")).toBe(false);
		expect(isSupportedPredictionService("commercial")).toBe(false);
	});

	it("excludes collocation only from traffic company types", () => {
		expect(isAvailablePredictionCompanyType("traffic", "COLLOCATION")).toBe(false);
		expect(isAvailablePredictionCompanyType(" TRAFFIC ", " collocation ")).toBe(false);
		expect(isAvailablePredictionCompanyType("traffic", "CP")).toBe(true);
		expect(isAvailablePredictionCompanyType("sms", "COLLOCATION")).toBe(true);
	});
});
