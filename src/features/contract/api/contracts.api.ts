import type { Paginated } from "#src/api/types";
import type {
	ContractListItemType,
	ContractsListQuery,
	PaginatedResult,
} from "../list/model/contracts.list.types";
// import type { ContractServicePath } from "./contract-service.types";
import { request } from "#src/utils/request";

export type ContractServicePath = | "openapi" | "traffic" | "psp" | "commercial"
  | "shahkar"
  | "sms/client"
  | "sms/vendor"
  | "sms-commission";

export interface ContractGapsResponse {
	company: {
		id: number
		name: string
	} | null
	service: {
		id: number
		name: string
		code: string
	} | null
	allowed_jalali_range: {
		start_jy: number
		start_jm: number
		end_jy: number
		end_jm: number
	} | null
	missing_months_by_year: Record<string, number[]>
	missing_gregorian_ranges: Array<{
		start_jy: number
		start_jm: number
		end_jy: number
		end_jm: number
		start_date: string
		end_date_exclusive: string
	}>
	vendor_gate_applied: boolean
	vendor_gate_service_code: string | null
}

export interface SmsCommissionAgentDto {
	id: number
	name: string
	company: number
	created_at: string
	updated_at: string
}

function buildContractPath(service: ContractServicePath, id?: number) {
	return id
		? `contracts/${service}/${id}/`
		: `contracts/${service}/`;
}

function toSearchParams(params: ContractsListQuery) {
	const out: Record<string, string> = {};

	Object.entries(params).forEach(([k, v]) => {
		if (v == null)
			return;
		out[k] = String(v);
	});

	return out;
}

/* ===================== LIST ===================== */

export function fetchContractsList(params: ContractsListQuery) {
	return request
		.get("contracts/list", { searchParams: toSearchParams(params) })
		.json<PaginatedResult<ContractListItemType>>();
}

/* ===================== DETAIL ===================== */

export function fetchContractDetail(
	service: ContractServicePath,
	id: number,
) {
	return request
		.get(buildContractPath(service, id))
		.json<any>();
}
/* ===================== CREATE ===================== */

export function fetchCreateContract(service: ContractServicePath, payload: any) {
	return request
		.post(buildContractPath(service), { json: payload })
		.json<any>();
}
/* ===================== UPDATE ===================== */

export function fetchUpdateContract(
	service: ContractServicePath,
	id: number,
	payload: any,
) {
	return request
		.put(buildContractPath(service, id), { json: payload })
		.json<any>();
}

/* ===================== DELETE ===================== */

export function fetchDeleteContract(
	service: ContractServicePath,
	id: number,
) {
	return request
		.delete(buildContractPath(service, id))
		.json<any>();
}

export function fetchContractGaps(serviceId: number, companyId: number) {
	return request
		.get("contracts/gaps/", {
			searchParams: {
				service_id: serviceId,
				company_id: companyId,
			},
		})
		.json<ContractGapsResponse>();
}

export function fetchSmsCommissionAgents() {
	return request
		.get("contracts/sms-commission/agents/", {
			searchParams: {
				page_size: 1000,
			},
		})
		.json<Paginated<SmsCommissionAgentDto>>();
}
