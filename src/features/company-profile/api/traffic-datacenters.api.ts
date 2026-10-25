import type { Paginated } from "#src/api/types";
import { request } from "#src/utils/request/";

const DATACENTERS_PATH = "contracts/traffic/datacenters/";

export interface TrafficDatacenterDto {
	id: number
	name: string
}

export interface TrafficDatacenterPayload {
	name: string
}

export async function listTrafficDatacenters() {
	const response = await request
		.get(DATACENTERS_PATH)
		.json<Paginated<TrafficDatacenterDto> | TrafficDatacenterDto[]>();
	return Array.isArray(response) ? response : response.results;
}

export async function createTrafficDatacenter(payload: TrafficDatacenterPayload) {
	return request.post(DATACENTERS_PATH, { json: payload }).json<TrafficDatacenterDto>();
}

export async function updateTrafficDatacenter(id: number, payload: TrafficDatacenterPayload) {
	return request.put(`${DATACENTERS_PATH}${id}/`, { json: payload }).json<TrafficDatacenterDto>();
}

export async function deleteTrafficDatacenter(id: number) {
	await request.delete(`${DATACENTERS_PATH}${id}/`).json();
}
