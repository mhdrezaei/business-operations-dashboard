import type {
	NotificationRuleDto,
	NotificationRulesListQuery,
	NotificationRulesPaginatedResponse,
	NotificationRuleUpsertPayload,
	NotificationRunDto,
} from "../model/notification-rules.types";
import { request } from "#src/utils/request";

const RULES_BASE = "notifications/rules";
const RUNS_BASE = "notifications/runs";

const RUN_NOW_ENDPOINTS = {
	IN_APP: "notifications/jobs/contract-expiry/run-now/",
	SMS: "notifications/jobs/contract-expiry-sms/run-now/",
} as const;

export function fetchNotificationRulesList(query: NotificationRulesListQuery) {
	return request
		.get(`${RULES_BASE}/`, { searchParams: query as Record<string, string | number | boolean | undefined> })
		.json<NotificationRulesPaginatedResponse>();
}

export function fetchCreateNotificationRule(payload: NotificationRuleUpsertPayload) {
	return request
		.post(`${RULES_BASE}/`, { json: payload })
		.json<NotificationRuleDto>();
}

export function fetchUpdateNotificationRule(id: number, payload: NotificationRuleUpsertPayload) {
	return request
		.put(`${RULES_BASE}/${id}/`, { json: payload })
		.json<NotificationRuleDto>();
}

export function fetchDeleteNotificationRule(id: number) {
	return request.delete(`${RULES_BASE}/${id}/`);
}

export function fetchLatestNotificationRun() {
	return request
		.get(`${RUNS_BASE}/latest/`)
		.json<NotificationRunDto>();
}

export async function fetchRunNotificationJob(channel: "IN_APP" | "SMS") {
	await request.post(RUN_NOW_ENDPOINTS[channel]);
}
