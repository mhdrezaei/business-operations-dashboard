import type { CompanyPersonDto } from "./company-people.types";
import { getAddToContractError, getNextContractOrder } from "./company-people.contract-order";

function person(id: number, contractOrder: number | null, role: CompanyPersonDto["role"] = "CEO"): CompanyPersonDto {
	return {
		id,
		company: 1,
		service: 1,
		role,
		full_name: `p${id}`,
		national_id: null,
		title: null,
		phone: null,
		email: null,
		is_signatory: false,
		contract_order: contractOrder,
		created_at: "",
		updated_at: "",
	};
}

describe("contract order rules", () => {
	it("appends after the people already in the role", () => {
		const people = [person(1, 1), person(2, 2), person(3, 1, "BOARD"), person(4, null)];
		expect(getNextContractOrder(people, "CEO")).toBe(3);
		expect(getAddToContractError(people, people[3])).toBeNull();
	});

	it("rejects more than 10 per role", () => {
		const people = Array.from({ length: 10 }, (_, i) => person(i + 1, i + 1));
		expect(getAddToContractError([...people, person(99, null)], person(99, null))).toContain("حداکثر");
	});

	it("rejects a duplicate slot number", () => {
		const people = [person(1, 2), person(2, null)];
		expect(getAddToContractError(people, people[1])).toContain("قبلاً استفاده شده");
	});
});
