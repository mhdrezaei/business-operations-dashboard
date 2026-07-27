// src/api/common/common.api.ts
import type { Paginated } from "#src/api/types";
import type { CompanyDto, ServiceDto } from "./common.types";
import { request } from "#src/utils/request";
import { COMMON_API } from "./common.paths";

interface FetchServicesOptions {
	domain?: string
}

interface FetchCompaniesByServiceOptions {
	companyType?: string | null
	search?: string | null
}

function isFetchServicesOptions(value: unknown): value is FetchServicesOptions {
	return !!value && typeof value === "object" && "domain" in value;
}

export function fetchServices(options?: FetchServicesOptions | unknown) {
	const domain = isFetchServicesOptions(options) ? options.domain : undefined;

	return request
		.get(COMMON_API.services, {
			searchParams: domain ? { domain } : undefined,
		})
		.json<Paginated<ServiceDto>>();
}

export function fetchCompaniesByService(serviceId: number, options?: FetchCompaniesByServiceOptions) {
	const searchParams: Record<string, string> = { service: String(serviceId) };

	if (options?.companyType)
		searchParams.company_type = options.companyType;
	if (options?.search)
		searchParams.search = options.search;

	return request
		.get(COMMON_API.companies, {
			searchParams,
		})
		.json<Paginated<CompanyDto>>();
}
