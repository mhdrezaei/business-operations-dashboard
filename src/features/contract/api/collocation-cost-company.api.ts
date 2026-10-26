import { fetchCompaniesByService } from "#src/api/common/common.api";

export const COLLOCATION_COST_COMPANY_NAME = "TRAFFIC_COLLOCATION_COST_GLOBAL";

/** The global company that holds telecom (rack cost) collocation contracts; null when it is not defined. */
export async function fetchCollocationCostCompanyId(serviceId: number) {
	const response = await fetchCompaniesByService(serviceId, {
		companyType: "COLLOCATION",
		search: COLLOCATION_COST_COMPANY_NAME,
	});
	const companies = response.results ?? [];
	const exact = companies.find(company => String(company.name ?? "").trim().toUpperCase() === COLLOCATION_COST_COMPANY_NAME);
	return (exact ?? companies[0])?.id ?? null;
}
