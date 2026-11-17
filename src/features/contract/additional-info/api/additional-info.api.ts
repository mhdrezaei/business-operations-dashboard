import type {
	GuaranteeCatalogItem,
	GuaranteePayload,
	GuaranteeRecord,
	GuaranteesListQuery,
	GuaranteeType,
	RealEndPayload,
	RealEndRecord,
} from "../model/additional-info.types";
import { request } from "#src/utils/request";

const ADDITIONAL_INFO_BASE = "contracts/additional-info";
const CATALOG_PATH = `${ADDITIONAL_INFO_BASE}/catalog/`;
const GUARANTEES_PATH = `${ADDITIONAL_INFO_BASE}/guarantees/`;
const REAL_END_PATH = `${ADDITIONAL_INFO_BASE}/real-end/`;

export interface PaginatedResult<T> {
	count: number
	next: string | null
	previous: string | null
	results: T[]
}

/* ================= CATALOG ================= */

export async function fetchGuaranteeCatalog(): Promise<GuaranteeCatalogItem[]> {
	const response = await request.get(CATALOG_PATH).json<GuaranteeCatalogItem[] | { results: GuaranteeCatalogItem[] }>();
	if (Array.isArray(response)) {
		return response;
	}
	return response?.results ?? [];
}

/* ================= GUARANTEES ================= */

export async function fetchGuarantees(
	params: GuaranteesListQuery,
): Promise<PaginatedResult<GuaranteeRecord>> {
	const searchParams: Record<string, string> = {
		type: params.type,
	};
	if (params.base_contract != null) {
		searchParams.base_contract = String(params.base_contract);
	}
	if (params.addendum_group_id) {
		searchParams.addendum_group_id = params.addendum_group_id;
	}
	if (params.scope) {
		searchParams.scope = params.scope;
	}

	return request
		.get(GUARANTEES_PATH, { searchParams })
		.json<PaginatedResult<GuaranteeRecord>>();
}

export async function fetchGuaranteeDetail(
	id: number,
	type: GuaranteeType,
): Promise<GuaranteeRecord> {
	return request
		.get(`${GUARANTEES_PATH}${id}/`, { searchParams: { type } })
		.json<GuaranteeRecord>();
}

export async function createGuarantee(
	payload: GuaranteePayload,
): Promise<GuaranteeRecord> {
	return request
		.post(GUARANTEES_PATH, { json: payload })
		.json<GuaranteeRecord>();
}

export async function updateGuarantee(
	id: number,
	type: GuaranteeType,
	payload: GuaranteePayload,
): Promise<GuaranteeRecord> {
	return request
		.put(`${GUARANTEES_PATH}${id}/`, {
			searchParams: { type },
			json: { ...payload, type },
		})
		.json<GuaranteeRecord>();
}

export async function deleteGuarantee(
	id: number,
	type: GuaranteeType,
): Promise<void> {
	await request.delete(`${GUARANTEES_PATH}${id}/`, {
		searchParams: { type },
	});
}

/* ================= REAL END ================= */

export async function fetchRealEndList(
	baseContractId: number,
): Promise<PaginatedResult<RealEndRecord>> {
	return request
		.get(REAL_END_PATH, { searchParams: { base_contract: String(baseContractId) } })
		.json<PaginatedResult<RealEndRecord>>();
}

export async function fetchRealEndDetail(id: number): Promise<RealEndRecord> {
	return request.get(`${REAL_END_PATH}${id}/`).json<RealEndRecord>();
}

export async function createRealEnd(
	payload: RealEndPayload,
): Promise<RealEndRecord> {
	return request
		.post(REAL_END_PATH, { json: payload })
		.json<RealEndRecord>();
}

export async function updateRealEnd(
	id: number,
	payload: RealEndPayload,
): Promise<RealEndRecord> {
	return request
		.put(`${REAL_END_PATH}${id}/`, { json: payload })
		.json<RealEndRecord>();
}

export async function deleteRealEnd(id: number): Promise<void> {
	await request.delete(`${REAL_END_PATH}${id}/`);
}
