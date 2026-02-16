import { queryOptions } from "@tanstack/react-query";
import { getCompanyDocument } from "../api/documents.api";

export function companyDocumentDetailQuery(id: number | null | undefined) {
	return queryOptions({
		queryKey: ["contracts", "companyDocuments", "detail", { id }],
		enabled: !!id,
		queryFn: () => getCompanyDocument(id!),
		staleTime: 60 * 1000,
	});
}
