import type { CompanyPersonDto, CompanyPersonFormValues } from "./company-people.types";
import { companyPersonDtoToPayload, companyPersonFormToPayload } from "./company-people.mappers";

const formValues: CompanyPersonFormValues = {
	role: "CEO",
	full_name: "  شخص نمونه  ",
	national_id: "0023475662",
	title: "  مدیرعامل  ",
	phone: [{ value: "09101922459" }],
	email: [{ value: "sample@example.com" }],
	is_signatory: true,
};

describe("company people payloads", () => {
	it("creates a person outside the contract order by default", () => {
		expect(companyPersonFormToPayload(114, 2, formValues)).toMatchObject({
			company: 114,
			service: 2,
			full_name: "شخص نمونه",
			contract_order: null,
		});
	});

	it("preserves person data while changing only the contract order", () => {
		const person: CompanyPersonDto = {
			id: 18,
			company: 114,
			service: 2,
			role: "COMMERCIAL",
			full_name: "رها شاهین پرواز",
			national_id: "0023475662",
			title: "مدیر مدیره",
			phone: ["09101922459"],
			email: ["sample@example.com"],
			is_signatory: false,
			contract_order: null,
			created_at: "2026-09-16T00:00:00Z",
			updated_at: "2026-09-16T00:00:00Z",
		};

		expect(companyPersonDtoToPayload(person, 2, 2)).toEqual({
			company: 114,
			service: 2,
			role: "COMMERCIAL",
			full_name: "رها شاهین پرواز",
			national_id: "0023475662",
			title: "مدیر مدیره",
			phone: ["09101922459"],
			email: ["sample@example.com"],
			is_signatory: false,
			contract_order: 2,
		});
	});
});
