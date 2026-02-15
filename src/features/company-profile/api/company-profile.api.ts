import type { CompanyProfileDto, Paginated } from "../sections/company-info/model/company-info.types";
import { request } from "#src/utils/request/";

export interface ListCompanyProfilesParams {
	company: number
	page?: number
	search?: string
	ordering?: string
}

export async function listCompanyProfiles(params: ListCompanyProfilesParams) {
	const searchParams: Record<string, string | number | boolean | undefined> = {
		company: params.company,
		page: params.page,
		search: params.search,
		ordering: params.ordering,
	};

	return request
		.get("contracts/company/profiles/", { searchParams })
		.json<Paginated<CompanyProfileDto>>();
}

/**
 * ⚠️ مسیرهای create/update را طبق بک‌اندت نهایی کن.
 * اگر DRF ViewSet باشد معمولا:
 * POST   contracts/company/profiles/
 * PATCH  contracts/company/profiles/:id/
 */
export async function createCompanyProfile(payload: Partial<CompanyProfileDto>) {
	return request
		.post("contracts/company/profiles/", { json: payload })
		.json<CompanyProfileDto>();
}

export async function updateCompanyProfile(id: number, payload: Partial<CompanyProfileDto>) {
	return request
		.patch(`contracts/company/profiles/${id}/`, { json: payload })
		.json<CompanyProfileDto>();
}
