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
	MISSING_PREV_MONTH_IN_APP: "notifications/jobs/performance-missing-prev-month/run-now/",
	MISSING_PREV_MONTH_SMS: "notifications/jobs/performance-missing-prev-month-sms/run-now/",
	BUSINESS_APPROVAL_PENDING: "notifications/jobs/business-approval-pending/run-now/",
	SIGN_PENDING: "notifications/jobs/sign-pending/run-now/",
} as const;

export type NotificationManualJob = keyof typeof RUN_NOW_ENDPOINTS;

export interface NotificationRunNowResponse {
	task_id: string
	status: string
}

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

export function fetchRunNotificationJob(job: NotificationManualJob) {
	return request.post(RUN_NOW_ENDPOINTS[job]).json<NotificationRunNowResponse>();
}
