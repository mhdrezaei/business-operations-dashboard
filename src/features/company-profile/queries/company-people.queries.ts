import type { ListCompanyPeopleParams } from "../sections/key-people/model/company-people.types";
import { queryOptions } from "@tanstack/react-query";
import { getCompanyPerson, listCompanyPeople } from "../api/key-people.api";

export function companyPeopleListQuery(params: ListCompanyPeopleParams | null) {
	return queryOptions({
		queryKey: ["contracts", "companyPeople", params],
		enabled: !!params?.company,
		queryFn: () => listCompanyPeople(params!),
		staleTime: 60 * 1000,
	});
}

export function companyPersonDetailQuery(id: number | null) {
	return queryOptions({
		queryKey: ["contracts", "companyPeople", "detail", { id }],
		enabled: !!id,
		queryFn: () => getCompanyPerson(id!),
		staleTime: 30 * 1000,
	});
}
