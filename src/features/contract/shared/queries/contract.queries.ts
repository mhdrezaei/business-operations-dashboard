import { fetchCompaniesByService, fetchServices } from "#src/api/common/common.api";
import { fetchContractGaps, fetchSmsCommissionAgents } from "#src/features/contract/api/contracts.api";
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
}: {
	serviceId: number | null | undefined
	companyId: number | null | undefined
}) {
	return queryOptions({
		queryKey: ["contracts", "gaps", { serviceId, companyId }],
		enabled: !!serviceId && !!companyId,
		queryFn: () => fetchContractGaps(serviceId!, companyId!),
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
