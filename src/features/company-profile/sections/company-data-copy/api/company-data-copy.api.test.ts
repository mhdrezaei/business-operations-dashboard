import { beforeEach, describe, expect, it, vi } from "vitest";
import { copyCompanyData } from "./company-data-copy.api";

const profileApi = vi.hoisted(() => ({
	createFinanceProfile: vi.fn(),
	createInternalProfile: vi.fn(),
	createLegalProfile: vi.fn(),
	createPublicProfile: vi.fn(),
	getFinanceProfile: vi.fn(),
	getInternalProfile: vi.fn(),
	getLegalProfile: vi.fn(),
	getPublicProfile: vi.fn(),
	updateFinanceProfile: vi.fn(),
	updateInternalProfile: vi.fn(),
	updateLegalProfile: vi.fn(),
	updatePublicProfile: vi.fn(),
}));

const bankApi = vi.hoisted(() => ({
	createBankAccount: vi.fn(),
	deleteBankAccount: vi.fn(),
	listBankAccounts: vi.fn(),
}));

const peopleApi = vi.hoisted(() => ({
	createCompanyPerson: vi.fn(),
	deleteCompanyPerson: vi.fn(),
	listCompanyPeople: vi.fn(),
}));

const shareholderApi = vi.hoisted(() => ({
	createShareholder: vi.fn(),
	deleteShareholder: vi.fn(),
	listShareholders: vi.fn(),
}));

vi.mock("../../../api/company-profile.api", () => profileApi);
vi.mock("../../../api/bank-accounts.api", () => bankApi);
vi.mock("../../../api/key-people.api", () => peopleApi);
vi.mock("../../../api/shareholders.api", () => shareholderApi);

describe("copyCompanyData", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("updates a populated destination profile without copying source identity fields", async () => {
		profileApi.getPublicProfile
			.mockResolvedValueOnce({
				id: 101,
				company: 10,
				legal_name: "شرکت مبدأ",
				brand_name: "برند مبدأ",
				legal_address: "تهران",
				postal_code: "123",
				map_address: "",
				map_latitude: "",
				map_longitude: "",
				phone: ["021"],
				mobile: [],
				fax: [],
				email: [],
				website: "",
				working_hours: "",
				social_links: "",
			})
			.mockResolvedValueOnce({ id: 202, company: 20 });

		await copyCompanyData({
			source: { companyId: 10, serviceId: 2 },
			destination: { companyId: 20, serviceId: 7 },
			sections: ["public"],
		});

		expect(profileApi.createPublicProfile).not.toHaveBeenCalled();
		expect(profileApi.updatePublicProfile).toHaveBeenCalledWith(202, expect.objectContaining({
			company: 20,
			service: 7,
			legal_name: "شرکت مبدأ",
			brand_name: "برند مبدأ",
			website: "",
			working_hours: "",
		}));
		expect(profileApi.updatePublicProfile.mock.calls[0]?.[1]).not.toHaveProperty("id");
	});

	it("replaces collection records with destination company and service ids", async () => {
		bankApi.listBankAccounts
			.mockResolvedValueOnce({
				results: [{
					id: 11,
					company: 10,
					bank_name: "ملت",
					account_number: "100",
					iban: "IR100",
					card_number: "1",
					account_holder_name: "مبدأ",
				}],
			})
			.mockResolvedValueOnce({
				results: [{ id: 22, company: 20 }],
			});

		await copyCompanyData({
			source: { companyId: 10, serviceId: 2 },
			destination: { companyId: 20, serviceId: 7 },
			sections: ["bankAccounts"],
		});

		expect(bankApi.listBankAccounts).toHaveBeenNthCalledWith(1, { company: 10 });
		expect(bankApi.listBankAccounts).toHaveBeenNthCalledWith(2, { company: 20 });
		expect(bankApi.deleteBankAccount).toHaveBeenCalledWith(22);
		expect(bankApi.createBankAccount).toHaveBeenCalledWith({
			company: 20,
			service: 7,
			bank_name: "ملت",
			account_number: "100",
			iban: "IR100",
			card_number: "1",
			account_holder_name: "مبدأ",
			contract_order: null,
		});
	});

	it("posts every source person separately and preserves contract order", async () => {
		peopleApi.listCompanyPeople
			.mockResolvedValueOnce({
				results: [
					{
						id: 11,
						company: 10,
						service: 2,
						role: "CEO",
						full_name: "مدیر اول",
						national_id: "0023654774",
						title: "مدیرعامل",
						phone: [],
						email: [],
						is_signatory: false,
						gender: "MALE",
						official_gazette_number: "55",
						official_gazette_date: "2024-01-02",
						contract_order: 3,
					},
					{
						id: 12,
						company: 10,
						service: 2,
						role: "FINANCE",
						full_name: "مدیر دوم",
						national_id: null,
						title: null,
						phone: ["09120000000"],
						email: ["finance@example.com"],
						is_signatory: true,
						contract_order: 10,
					},
				],
			})
			.mockResolvedValueOnce({ results: [{ id: 21, company: 20 }] });

		await copyCompanyData({
			source: { companyId: 10, serviceId: 2 },
			destination: { companyId: 20, serviceId: 7 },
			sections: ["people"],
		});

		expect(peopleApi.listCompanyPeople).toHaveBeenNthCalledWith(1, { company: 10 });
		expect(peopleApi.listCompanyPeople).toHaveBeenNthCalledWith(2, { company: 20 });
		expect(peopleApi.deleteCompanyPerson).toHaveBeenCalledWith(21);
		expect(peopleApi.createCompanyPerson).toHaveBeenCalledTimes(2);
		expect(peopleApi.createCompanyPerson).toHaveBeenNthCalledWith(1, {
			company: 20,
			service: 7,
			role: "CEO",
			full_name: "مدیر اول",
			national_id: "0023654774",
			title: "مدیرعامل",
			phone: [],
			email: [],
			gender: "MALE",
			is_signatory: false,
			official_gazette_number: "55",
			official_gazette_date: "2024-01-02",
			contract_order: 3,
		});
		expect(peopleApi.createCompanyPerson).toHaveBeenNthCalledWith(2, expect.objectContaining({
			company: 20,
			service: 7,
			full_name: "مدیر دوم",
			national_id: "",
			title: "",
			gender: null,
			official_gazette_number: null,
			official_gazette_date: null,
			contract_order: 10,
		}));
	});

	it("copies official gazette fields of the legal profile", async () => {
		profileApi.getLegalProfile
			.mockResolvedValueOnce({
				id: 1,
				company: 10,
				national_id: "1",
				tax_national_id: "2",
				registration_number: "3",
				tax_registration_number: "4",
				registration_place: "تهران",
				registration_date: "2020-01-01",
				official_gazette_number: "777",
				official_gazette_date: "2021-02-03",
				legal_person_type: "LLC",
				branch_code: "0",
			})
			.mockResolvedValueOnce(null);

		await copyCompanyData({
			source: { companyId: 10, serviceId: 2 },
			destination: { companyId: 20, serviceId: 7 },
			sections: ["legal"],
		});

		expect(profileApi.createLegalProfile).toHaveBeenCalledWith(expect.objectContaining({
			company: 20,
			official_gazette_number: "777",
			official_gazette_date: "2021-02-03",
		}));
	});
});
