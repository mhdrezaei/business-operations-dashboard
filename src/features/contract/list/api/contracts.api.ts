import type {
	ContractListItemType,
	ContractsListQuery,
	PaginatedResult,
} from "../model/contracts.list.types";
import { request } from "#src/utils/request";

function toSearchParams(params: ContractsListQuery) {
	const out: Record<string, string> = {};

	Object.entries(params).forEach(([k, v]) => {
		if (v === undefined || v === null)
			return;
		out[k] = String(v);
	});

	return out;
}

export function fetchContractsList(params: ContractsListQuery) {
	// ✅ فقط این مهم است
	return request
		.get("contracts/list", { searchParams: toSearchParams(params) })
		.json<PaginatedResult<ContractListItemType>>();
}

export function fetchContractDetail(id: number) {
	return request.get(`/contracts/${id}`).json<any>();
}

export function fetchUpdateContract(id: number, payload: any) {
	return request.patch(`/contracts/${id}`, { json: payload }).json<any>();
}

export function fetchDeleteContract(id: number) {
	return request.delete(`/contracts/${id}`).json<any>();
}
