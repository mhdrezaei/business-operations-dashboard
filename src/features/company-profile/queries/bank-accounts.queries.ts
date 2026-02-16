import { queryOptions } from "@tanstack/react-query";
import { listBankAccounts } from "../api/bank-accounts.api";

export function bankAccountsByCompanyQuery(companyId: number | null | undefined) {
	return queryOptions({
		queryKey: ["contracts", "bankAccounts", { companyId }],
		enabled: !!companyId,
		queryFn: () => listBankAccounts({ company: companyId! }),
		staleTime: 60 * 1000,
	});
}
