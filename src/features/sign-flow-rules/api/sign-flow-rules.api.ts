import type { SignFlowRule, SignFlowRulePayload, SignFlowRulesResponse } from "../model/sign-flow-rules.types";
import { request } from "#src/utils/request";

const BASE = "contracts/sign-flow/rules";

export function fetchSignFlowRules(params: { page?: number, page_size?: number } = {}) {
	return request.get(`${BASE}/`, { searchParams: params }).json<SignFlowRulesResponse>();
}

export function createSignFlowRule(payload: SignFlowRulePayload) {
	return request.post(`${BASE}/`, { json: payload }).json<SignFlowRule>();
}

export function updateSignFlowRule(id: number, payload: SignFlowRulePayload) {
	return request.put(`${BASE}/${id}/`, { json: payload }).json<SignFlowRule>();
}

export function deleteSignFlowRule(id: number) {
	return request.delete(`${BASE}/${id}/`);
}
