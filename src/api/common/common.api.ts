import type { Paginated } from "#src/api/types";
import type { CompanyDto, ServiceDto } from "./common.types";
import { request } from "#src/utils/request";
import { COMMON_API } from "./common.paths";

interface FetchServicesOptions {
	domain?: string
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

export function fetchCompaniesByService(serviceId: number) {
	return request
		.get(COMMON_API.companies, {
			searchParams: { service: serviceId },
		})
		.json<Paginated<CompanyDto>>();
}
