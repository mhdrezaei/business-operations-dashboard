import type { ListShareholdersParams, Paginated, ShareholderDto } from "../sections/shareholders/model/shareholders.types";
import { request } from "#src/utils/request/";

function toSearchParams(params: Record<string, any>) {
	const out: Record<string, string | number | boolean | undefined> = {};
	Object.entries(params).forEach(([k, v]) => {
		if (v === null || v === undefined || v === "")
			return;
		out[k] = v as any;
	});
	return out;
}

export async function listShareholders(params: ListShareholdersParams) {
	return request
		.get("contracts/company/shareholders/", { searchParams: toSearchParams(params) })
		.json<Paginated<ShareholderDto>>();
}

export async function createShareholder(payload: any) {
	return request
		.post("contracts/company/shareholders/", { json: payload })
		.json<ShareholderDto>();
}

export async function updateShareholder(id: number, payload: any) {
	return request
		.put(`contracts/company/shareholders/${id}/`, { json: payload })
		.json<ShareholderDto>();
}

export async function deleteShareholder(id: number) {
	await request.delete(`contracts/company/shareholders/${id}/`);
}
