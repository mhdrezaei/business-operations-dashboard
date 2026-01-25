import type { Paginated } from "#src/api/types";
import type { CompanyDto, ServiceDto } from "./common.types";
import { request } from "#src/utils/request";
import { COMMON_API } from "./common.paths";

export function fetchServices() {
	return request
		.get(COMMON_API.services)
		.json<Paginated<ServiceDto>>();
}

export function fetchCompaniesByService(serviceId: number) {
	return request
		.get(COMMON_API.companies, {
			searchParams: { service: serviceId },
		})
		.json<Paginated<CompanyDto>>();
}
