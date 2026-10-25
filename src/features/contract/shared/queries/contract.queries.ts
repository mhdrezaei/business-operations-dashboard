import type { ContractServicePath } from "#src/features/contract/api/contracts.api";
import { fetchCompaniesByService, fetchServices } from "#src/api/common/common.api";
import { fetchCollocationCostCompanyId } from "#src/features/contract/api/collocation-cost-company.api";
import { fetchContractApprovalHistory, fetchContractGaps, fetchSmsCommissionAgents, fetchTrafficDatacenters } from "#src/features/contract/api/contracts.api";
import { queryOptions } from "@tanstack/react-query";

export function servicesQuery() {
	return queryOptions({
		queryKey: ["common", "services"],
		queryFn: fetchServices,
		staleTime: 5 * 60 * 1000,
	});
}

export function companiesByServiceQuery(serviceId: number | null | undefined, options?: { includeInternal?: boolean }) {
	return queryOptions({
		queryKey: ["common", "companies", { serviceId, ...options }],
		enabled: !!serviceId,
		queryFn: () => fetchCompaniesByService(serviceId!, options),
		staleTime: 2 * 60 * 1000,
	});
}

export const contractGapsRootKey = ["contracts", "gaps"] as const;
export const companyContractsRootKey = ["contracts", "company-contracts"] as const;

export function contractGapsQuery({
	serviceId,
	companyId,
	companyType,
	allowWithoutCompany = false,
}: {
	serviceId: number | null | undefined
	companyId: number | null | undefined
	companyType?: string | null | undefined
	/** BE فقط برای SMS vendor و هزینه کولوکیشن مخابرات گپ بدون شرکت می‌دهد. */
	allowWithoutCompany?: boolean
}) {
	return queryOptions({
		queryKey: [...contractGapsRootKey, { serviceId, companyId, companyType }],
		enabled: !!serviceId && (!!companyId || allowWithoutCompany),
		queryFn: () => fetchContractGaps(serviceId!, companyId, companyType),
		staleTime: 30 * 1000,
	});
}

export function collocationCostCompanyQuery(serviceId: number) {
	return queryOptions({
		queryKey: ["contracts", "collocation-cost-company", serviceId],
		queryFn: () => fetchCollocationCostCompanyId(serviceId),
		staleTime: 5 * 60 * 1000,
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

export function contractApprovalQuery(service: ContractServicePath, contractId: number) {
	return queryOptions({
		queryKey: ["contracts", "approval-history", service, contractId],
		queryFn: () => fetchContractApprovalHistory(service, contractId),
	});
}
