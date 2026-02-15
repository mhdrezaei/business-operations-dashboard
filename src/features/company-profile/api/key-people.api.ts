import type { Paginated } from "#src/features/company-profile/shared/types"; // اگر دارید، اگر ندارید همین رو تو model تعریف کن
import type { CompanyPersonDto, ListCompanyPeopleParams } from "../sections/key-people/model/company-people.types";
// src/features/company-profile/sections/key-people/api/company-people.api.ts
import { request } from "#src/utils/request/";

function toSearchParams(params: ListCompanyPeopleParams) {
	// ky SearchParamsOption نیاز به index signature داره
	return params as unknown as Record<string, string | number | boolean | undefined>;
}

export async function listCompanyPeople(params: ListCompanyPeopleParams) {
	return request
		.get("contracts/company/people/", { searchParams: toSearchParams(params) })
		.json<Paginated<CompanyPersonDto>>();
}

export async function getCompanyPerson(id: number) {
	return request
		.get(`contracts/company/people/${id}/`)
		.json<CompanyPersonDto>();
}

export async function createCompanyPerson(payload: Partial<CompanyPersonDto>) {
	return request
		.post("contracts/company/people/", { json: payload })
		.json<CompanyPersonDto>();
}

export async function updateCompanyPerson(id: number, payload: Partial<CompanyPersonDto>) {
	return request
		.put(`contracts/company/people/${id}/`, { json: payload })
		.json<CompanyPersonDto>();
}

export async function deleteCompanyPerson(id: number) {
	await request.delete(`contracts/company/people/${id}/`);
}
