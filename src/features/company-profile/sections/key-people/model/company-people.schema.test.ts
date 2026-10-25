import { companyPersonSchema } from "./company-people.schema";

const base = {
	role: "CEO",
	full_name: "شخص نمونه",
	is_signatory: false,
	national_id: "",
	title: "",
	gender: null,
	official_gazette_number: "",
	official_gazette_date: "",
	phone: [{ value: "" }],
	email: [{ value: "" }],
};

describe("company person schema", () => {
	it("requires only the name", () => {
		expect(companyPersonSchema.safeParse(base).success).toBe(true);
		expect(companyPersonSchema.safeParse({ ...base, full_name: "  " }).success).toBe(false);
	});

	it("limits the official gazette number to 64 characters", () => {
		expect(companyPersonSchema.safeParse({ ...base, official_gazette_number: "1".repeat(65) }).success).toBe(false);
	});
});

describe("company person format rules", () => {
	it("validates national id, phone and email only when present", () => {
		expect(companyPersonSchema.safeParse({ ...base, national_id: "123" }).success).toBe(false);
		expect(companyPersonSchema.safeParse({ ...base, national_id: "1234567890" }).success).toBe(true);
		expect(companyPersonSchema.safeParse({ ...base, phone: [{ value: "0912" }] }).success).toBe(false);
		expect(companyPersonSchema.safeParse({ ...base, phone: [{ value: "09121234567" }] }).success).toBe(true);
		expect(companyPersonSchema.safeParse({ ...base, email: [{ value: "bad" }] }).success).toBe(false);
		expect(companyPersonSchema.safeParse({ ...base, email: [{ value: "a@b.com" }] }).success).toBe(true);
	});
});
