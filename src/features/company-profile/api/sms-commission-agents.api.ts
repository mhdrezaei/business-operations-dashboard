import type { Paginated } from "#src/api/types";
import { request } from "#src/utils/request/";

const AGENTS_PATH = "contracts/sms-commission/agents/";

export interface SmsCommissionAgentDto {
	id: number
	name: string
	company: number | { id: number }
}

export interface SmsCommissionAgentPayload {
	name: string
	company: number
}

export function agentCompanyId(agent: SmsCommissionAgentDto) {
	return typeof agent.company === "object" ? agent.company.id : agent.company;
}

export async function listSmsCommissionAgents() {
	const response = await request
		.get(AGENTS_PATH, { searchParams: { page_size: 1000 } })
		.json<Paginated<SmsCommissionAgentDto> | SmsCommissionAgentDto[]>();
	return Array.isArray(response) ? response : response.results;
}

export async function createSmsCommissionAgent(payload: SmsCommissionAgentPayload) {
	return request.post(AGENTS_PATH, { json: payload }).json<SmsCommissionAgentDto>();
}

export async function updateSmsCommissionAgent(id: number, payload: SmsCommissionAgentPayload) {
	return request.put(`${AGENTS_PATH}${id}/`, { json: payload }).json<SmsCommissionAgentDto>();
}

export async function deleteSmsCommissionAgent(id: number) {
	await request.delete(`${AGENTS_PATH}${id}/`).json();
}
