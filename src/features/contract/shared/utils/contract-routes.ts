import type { ContractServicePath } from "#src/features/contract/api/contracts.api";

export interface ContractEditRouteParams {
	contractId: number
	service: ContractServicePath
	serviceId: number
	companyType?: string | null
}

/** All contracts share one edit tab; the contract is selected through the query string. */
export function buildContractEditPath({ contractId, service, serviceId, companyType }: ContractEditRouteParams) {
	return `/contracts/edit?contractId=${contractId}&service=${encodeURIComponent(service)}&serviceId=${serviceId}&companyType=${encodeURIComponent(companyType ?? "")}`;
}

/** حالت اولیه صفحه ایجاد (old: `location.state`)؛ مثلاً «ایجاد قرارداد جدید از روی ردیف لیست». */
export interface ContractCreateRouteState {
	serviceId?: number | null
	companyId?: number | null
	companyType?: string | null
	counterpartyType?: "partners" | "gov_ops" | null
}
