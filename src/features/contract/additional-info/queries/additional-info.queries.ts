import type { QueryClient } from "@tanstack/react-query";
import type {
	GuaranteeRecord,
	GuaranteesListQuery,
	GuaranteeType,
	RealEndRecord,
} from "../model/additional-info.types";
import { queryOptions, useQueries, useQuery } from "@tanstack/react-query";
import {
	fetchGuaranteeCatalog,
	fetchGuaranteeDetail,
	fetchGuarantees,
	fetchRealEndDetail,
	fetchRealEndList,
} from "../api/additional-info.api";
import { GUARANTEE_TYPES } from "../model/additional-info.types";

export function guaranteeCatalogQuery() {
	return queryOptions({
		queryKey: ["contracts", "additional-info", "catalog"],
		queryFn: fetchGuaranteeCatalog,
		staleTime: 1000 * 60 * 60, // 1 hour
	});
}

export function guaranteesListQuery(params: GuaranteesListQuery) {
	return queryOptions({
		queryKey: [
			"contracts",
			"additional-info",
			"guarantees",
			params.type,
			params.base_contract ?? null,
			params.addendum_group_id ?? null,
			params.scope ?? null,
		],
		queryFn: () => fetchGuarantees(params),
		enabled: Boolean(params.type),
	});
}

export function guaranteeDetailQuery(id: number, type: GuaranteeType) {
	return queryOptions({
		queryKey: ["contracts", "additional-info", "guarantee-detail", type, id],
		queryFn: () => fetchGuaranteeDetail(id, type),
		enabled: id > 0 && Boolean(type),
	});
}

export function realEndListQuery(baseContractId: number | null | undefined) {
	return queryOptions({
		queryKey: ["contracts", "additional-info", "real-end", baseContractId],
		queryFn: () => fetchRealEndList(baseContractId!),
		enabled: baseContractId != null && baseContractId > 0,
	});
}

export function realEndDetailQuery(id: number | null | undefined) {
	return queryOptions({
		queryKey: ["contracts", "additional-info", "real-end-detail", id],
		queryFn: () => fetchRealEndDetail(id!),
		enabled: id != null && id > 0,
	});
}

export function invalidateContractAdditionalInfo(
	queryClient: QueryClient,
	baseContractId?: number | null,
) {
	queryClient.invalidateQueries({
		queryKey: ["contracts", "additional-info", "guarantees"],
	});
	if (baseContractId != null) {
		queryClient.invalidateQueries({
			queryKey: ["contracts", "additional-info", "real-end", baseContractId],
		});
	}
}

/**
 * Fetch guarantees across all 4 types for a specific base_contract and optional addendum_group_id.
 */
export function useContractAllGuarantees(
	baseContractId: number | null | undefined,
	addendumGroupId?: string | null,
	scope?: GuaranteesListQuery["scope"],
) {
	const results = useQueries({
		queries: GUARANTEE_TYPES.map(type => ({
			...guaranteesListQuery({
				type,
				base_contract: baseContractId ?? undefined,
				addendum_group_id: addendumGroupId ?? undefined,
				scope,
			}),
			enabled: baseContractId != null && baseContractId > 0,
		})),
	});

	const isLoading = results.some(r => r.isLoading);
	const isFetching = results.some(r => r.isFetching);
	const isError = results.some(r => r.isError);

	const allGuarantees: GuaranteeRecord[] = [];
	results.forEach((res) => {
		if (res.data?.results) {
			allGuarantees.push(...res.data.results);
		}
	});

	// Sort guarantees by id descending (newest first)
	allGuarantees.sort((a, b) => b.id - a.id);

	return {
		guarantees: allGuarantees,
		isLoading,
		isFetching,
		isError,
		refetch: () => results.forEach(r => r.refetch()),
	};
}

/**
 * Fetch the single real-end record for a base_contract.
 */
export function useContractRealEnd(baseContractId: number | null | undefined) {
	const query = useQuery(realEndListQuery(baseContractId));
	const record: RealEndRecord | null = query.data?.results?.[0] ?? null;

	return {
		realEnd: record,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		isError: query.isError,
		refetch: query.refetch,
	};
}
