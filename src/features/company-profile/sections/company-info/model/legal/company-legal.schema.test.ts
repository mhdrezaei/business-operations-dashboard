import { emptyLegalProfileValues, legalFormToPayload } from "./company-legal.mappers";
import { legalProfileSchema } from "./company-legal.schema";

describe("legal profile schema", () => {
	it("accepts all legal person types and an empty national id", () => {
		for (const type of ["PRIVATE_JOINT_STOCK", "PUBLIC_JOINT_STOCK", "LIMITED_LIABILITY", "INSTITUTE", "OTHER"])
			expect(legalProfileSchema.safeParse({ ...emptyLegalProfileValues, legal_person_type: type }).success).toBe(true);
	});

	it("sends official gazette fields", () => {
		const payload = legalFormToPayload({ ...emptyLegalProfileValues, official_gazette_number: " 12 ", official_gazette_date: "2026-01-02" });
		expect(payload).toMatchObject({ official_gazette_number: "12", official_gazette_date: "2026-01-02" });
	});

	it("sends null for cleared dates", () => {
		const payload = legalFormToPayload({ ...emptyLegalProfileValues, registration_date: "", official_gazette_date: "" });
		expect(payload.official_gazette_date).toBeNull();
		expect(payload.registration_date).toBeNull();
	});
});

describe("legal national id", () => {
	it("is optional but must be valid when present", () => {
		expect(legalProfileSchema.safeParse({ ...emptyLegalProfileValues, national_id: "123" }).success).toBe(false);
		expect(legalProfileSchema.safeParse({ ...emptyLegalProfileValues, national_id: "14001234567" }).success).toBe(true);
	});
});
