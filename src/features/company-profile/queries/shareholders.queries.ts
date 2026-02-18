import { queryOptions } from "@tanstack/react-query";
import { listShareholders } from "../api/shareholders.api";

export function shareholdersByCompanyQuery(companyId: number | null | undefined, params?: { search?: string, ordering?: string, page?: number }) {
	return queryOptions({
		queryKey: ["contracts", "shareholders", { companyId, ...(params ?? {}) }],
		enabled: !!companyId,
		queryFn: () => listShareholders({ company: companyId!, ...(params ?? {}) }),
		staleTime: 60 * 1000,
	});
}
