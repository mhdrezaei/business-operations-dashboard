import type { OpenApiPredictionYearDto } from "../../../api/predictions.api";
import type { PredictionFormValues } from "../../model/prediction.form.types";
import { describe, expect, it } from "vitest";
import { dtoToOpenApiPredictionForm, openApiPredictionFormToPayload, resolveOpenApiModel } from "./openapi.mappers";

const channels = { value: { SMS_MCI_FA: 100 }, income: { SMS_MCI_FA: 100 }, expense: { SMS_MCI_FA: 100 } };

const packageRecord = {
	id: 7,
	service: 3,
	fiscal_year: 1404,
	openapi_model: "PACKAGE",
	bill_inquiry_value_year: "10.00",
	bill_inquiry_income_year: "20.00",
	bill_inquiry_expense_year: "30.00",
	sms_total_value_year: "40.00",
	traffic_total_income_year: "50.00",
	q1_percent: 25,
	q2_percent: 25,
	q3_percent: 25,
	q4_percent: 25,
	manual_shares: { SMS_TOTAL: { value: { 1: 100 } }, TRAFFIC: { income: { 1: 100 } }, channels },
	note: "n",
	created_at: "",
	updated_at: "",
} as unknown as OpenApiPredictionYearDto;

function toPayload(record: OpenApiPredictionYearDto) {
	const form = dtoToOpenApiPredictionForm(record);
	return openApiPredictionFormToPayload({ ...form, serviceId: record.service } as unknown as PredictionFormValues);
}

describe("openapi PACKAGE prediction mapper", () => {
	it("keeps the PACKAGE model when resolving a stored record", () => {
		expect(resolveOpenApiModel(packageRecord)).toBe("PACKAGE");
		expect(dtoToOpenApiPredictionForm(packageRecord).serviceFields).toMatchObject({ openapiModel: "PACKAGE" });
	});

	it("round-trips without changing the model or losing SMS/traffic totals and channels", () => {
		const payload = toPayload(packageRecord);

		expect(payload).not.toHaveProperty("openapi_model");
		expect(payload).toMatchObject({
			bill_inquiry_value_year: 10,
			sms_total_value_year: "40.00",
			traffic_total_income_year: "50.00",
		});
		expect(payload.manual_shares).toEqual(packageRecord.manual_shares);
	});

	it("still sends the model for LEGACY records", () => {
		expect(toPayload({ ...packageRecord, openapi_model: "LEGACY", manual_shares: {} })).toMatchObject({ openapi_model: "LEGACY" });
	});
});
