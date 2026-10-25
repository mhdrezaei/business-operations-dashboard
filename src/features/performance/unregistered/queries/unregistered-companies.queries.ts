import { fetchCompaniesByService } from "#src/api/common/common.api";
import { queryOptions } from "@tanstack/react-query";

export function unregisteredCompaniesQuery(serviceId: number, companyType: string | undefined) {
	return queryOptions({
		queryKey: ["performances", "unregistered-companies", { serviceId, companyType }],
		queryFn: () => fetchCompaniesByService(serviceId, { companyType, pageSize: 1000 }),
		staleTime: 2 * 60 * 1000,
	});
}
