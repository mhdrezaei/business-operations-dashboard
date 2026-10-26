import { fetchCompaniesByService, fetchServices } from "#src/api/common/common.api";
import { queryOptions } from "@tanstack/react-query";
import { listSmsCommissionAgents } from "../api/sms-commission-agents.api";
import { listTrafficDatacenters } from "../api/traffic-datacenters.api";

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

export function smsCommissionAgentsQuery() {
	return queryOptions({
		queryKey: ["contracts", "smsCommissionAgents"],
		queryFn: listSmsCommissionAgents,
		staleTime: 60 * 1000,
	});
}

export function trafficDatacentersQuery(enabled = true) {
	return queryOptions({
		queryKey: ["contracts", "trafficDatacenters"],
		enabled,
		queryFn: listTrafficDatacenters,
		staleTime: 60 * 1000,
	});
}
