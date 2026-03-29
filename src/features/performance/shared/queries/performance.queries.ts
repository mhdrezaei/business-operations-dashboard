import type { PerformanceContractServicePath } from "#src/features/performance/api/performances.api";
import { fetchCompaniesByService, fetchServices } from "#src/api/common/common.api";
import {
	fetchPerformanceContracts,
	fetchPerformanceGaps,
	fetchPerformanceReportAvailability,
	fetchSmsCommissionAgents,
} from "#src/features/performance/api/performances.api";
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

export function performanceGapsQuery({
	serviceId,
	companyId,
}: {
	serviceId: number | null | undefined
	companyId: number | null | undefined
}) {
	return queryOptions({
		queryKey: ["performances", "gaps", { serviceId, companyId }],
		enabled: !!serviceId && !!companyId,
		queryFn: () => fetchPerformanceGaps(serviceId!, companyId!),
		staleTime: 30 * 1000,
	});
}

export function performanceContractsQuery({
	servicePath,
	serviceId,
	companyId,
}: {
	servicePath: PerformanceContractServicePath | null
	serviceId: number | null | undefined
	companyId: number | null | undefined
}) {
	return queryOptions({
		queryKey: ["performances", "contracts", { servicePath, serviceId, companyId }],
		enabled: !!servicePath && !!serviceId && !!companyId,
		queryFn: () => fetchPerformanceContracts(servicePath!, serviceId!, companyId!),
		staleTime: 30 * 1000,
	});
}

export function smsCommissionAgentsQuery(enabled: boolean) {
	return queryOptions({
		queryKey: ["performances", "smsCommissionAgents"],
		enabled,
		queryFn: fetchSmsCommissionAgents,
		staleTime: 2 * 60 * 1000,
	});
}

export function performanceReportAvailabilityQuery({
	serviceId,
	shPeriods,
}: {
	serviceId: number | null | undefined
	shPeriods?: string[]
}) {
	const periodsKey = (shPeriods ?? [])
		.map(item => String(item ?? "").trim())
		.filter(Boolean)
		.join(",");

	return queryOptions({
		queryKey: ["performances", "report", "availability", { serviceId, periods: periodsKey }],
		enabled: !!serviceId,
		queryFn: () => fetchPerformanceReportAvailability(serviceId!, shPeriods),
		staleTime: 30 * 1000,
	});
}
