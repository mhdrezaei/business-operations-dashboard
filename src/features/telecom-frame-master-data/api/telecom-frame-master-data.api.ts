import type { TelecomFrameDirectoryEntryDto, TelecomFrameDirectoryResource } from "#src/features/contract/api/telecom-frame.api";
import type { MasterDataPayload } from "../model/telecom-frame-master-data.schema";
import { request } from "#src/utils/request";

const BASE = "contracts/telecom-frame";

export function createTelecomFrameEntry(resource: TelecomFrameDirectoryResource, payload: MasterDataPayload) {
	return request.post(`${BASE}/${resource}/`, { json: payload }).json<TelecomFrameDirectoryEntryDto>();
}

export function updateTelecomFrameEntry(resource: TelecomFrameDirectoryResource, id: number, payload: MasterDataPayload) {
	return request.put(`${BASE}/${resource}/${id}/`, { json: payload }).json<TelecomFrameDirectoryEntryDto>();
}

export function deleteTelecomFrameEntry(resource: TelecomFrameDirectoryResource, id: number) {
	return request.delete(`${BASE}/${resource}/${id}/`);
}
