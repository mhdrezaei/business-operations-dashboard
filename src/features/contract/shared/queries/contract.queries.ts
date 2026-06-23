import { fetchCompaniesByService, fetchServices } from "#src/api/common/common.api";
import { fetchContractGaps, fetchSmsCommissionAgents, fetchTrafficDatacenters } from "#src/features/contract/api/contracts.api";
import { queryOptions } from "@tanstack/react-query";

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

export function contractGapsQuery({
	serviceId,
	companyId,
	companyType,
}: {
	serviceId: number | null | undefined
	companyId: number | null | undefined
	companyType?: string | null | undefined
}) {
	const hasCompanyScope = !!companyId || !!companyType;
	return queryOptions({
		queryKey: ["contracts", "gaps", { serviceId, companyId, companyType }],
		enabled: !!serviceId && hasCompanyScope,
		queryFn: () => fetchContractGaps(serviceId!, companyId, companyType),
		staleTime: 30 * 1000,
	});
}

export function smsCommissionAgentsQuery(enabled: boolean) {
	return queryOptions({
		queryKey: ["contracts", "smsCommissionAgents"],
		enabled,
		queryFn: fetchSmsCommissionAgents,
		staleTime: 2 * 60 * 1000,
	});
}

export function trafficDatacentersQuery(enabled: boolean) {
	return queryOptions({
		queryKey: ["contracts", "traffic", "datacenters"],
		enabled,
		queryFn: fetchTrafficDatacenters,
		staleTime: 5 * 60 * 1000,
	});
}
