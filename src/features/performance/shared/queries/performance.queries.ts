import type { PerformanceContractServicePath, PerformanceReportAvailabilityQuery } from "#src/features/performance/api/performances.api";
import { fetchCompaniesByService, fetchServices } from "#src/api/common/common.api";
import {
	fetchMonthlyContractStatus,
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
	companyType,
}: {
	serviceId: number | null | undefined
	companyId: number | null | undefined
	companyType?: string | null | undefined
}) {
	return queryOptions({
		queryKey: ["performances", "gaps", { serviceId, companyId, companyType }],
		enabled: !!serviceId && (!!companyId || !!companyType),
		queryFn: () => fetchPerformanceGaps({
			serviceId: serviceId!,
			companyId,
			companyType,
		}),
		staleTime: 30 * 1000,
	});
}

export function performanceContractsQuery({
	servicePath,
	serviceId,
	companyId,
	companyType,
}: {
	servicePath: PerformanceContractServicePath | null
	serviceId: number | null | undefined
	companyId: number | null | undefined
	companyType?: string | null | undefined
}) {
	return queryOptions({
		queryKey: ["performances", "contracts", { servicePath, serviceId, companyId, companyType }],
		enabled: !!servicePath && !!serviceId && !!companyId,
		queryFn: () => fetchPerformanceContracts(servicePath!, serviceId!, companyId!, companyType),
		staleTime: 30 * 1000,
	});
}

export function monthlyContractStatusQuery({
	serviceId,
	companyId,
	companyType,
	year,
	month,
}: {
	serviceId: number | null | undefined
	companyId: number | null | undefined
	companyType?: string | null | undefined
	year: number | null | undefined
	month: number | null | undefined
}) {
	return queryOptions({
		queryKey: ["contracts", "monthly-status", { serviceId, companyId, companyType, year, month }],
		enabled: !!serviceId && !!companyId && !!year && !!month,
		queryFn: () => fetchMonthlyContractStatus({
			serviceId: serviceId!,
			companyId: companyId!,
			companyType,
			year: year!,
			month: month!,
		}),
		staleTime: 30 * 1000,
	});
}

export function smsCommissionAgentsQuery(enabled: boolean) {
	return queryOptions({
		queryKey: ["performances", "smsCommissionAgents"],
		enabled,
		queryFn: fetchSmsCommissionAgents,
		staleTime: 2 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});
}

export function performanceReportAvailabilityQuery(params: PerformanceReportAvailabilityQuery | null) {
	return queryOptions({
		queryKey: ["performances", "report", "availability", params],
		enabled: !!params,
		queryFn: () => fetchPerformanceReportAvailability(params!),
		staleTime: 30 * 1000,
	});
}
