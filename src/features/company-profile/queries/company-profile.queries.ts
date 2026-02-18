import { fetchCompaniesByService, fetchServices } from "#src/api/common/common.api";
import { queryOptions } from "@tanstack/react-query";
import { listCompanyProfiles } from "../api/company-profile.api";

export function servicesQuery() {
	return queryOptions({
		queryKey: ["common", "services"],
		queryFn: fetchServices,
		staleTime: 5 * 60 * 1000,
	});
}

export function companiesByServiceQuery(serviceId: number | null | undefined) {
	return queryOptions({
		queryKey: ["common", "companies", { serviceId }],
		enabled: !!serviceId,
		queryFn: () => fetchCompaniesByService(serviceId!),
		staleTime: 2 * 60 * 1000,
	});
}

export function companyProfilesByCompanyQuery(companyId: number | null | undefined) {
	return queryOptions({
		queryKey: ["contracts", "companyProfiles", { companyId }],
		enabled: !!companyId,
		queryFn: () => listCompanyProfiles({ company: companyId! }),
		staleTime: 60 * 1000,
	});
}
