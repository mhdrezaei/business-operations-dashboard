import type { AuditLogDto, AuditLogsListQuery, AuditLogsPaginatedResponse } from "../model/admin-logs.types";

import { request } from "#src/utils/request";

const BASE = "audit/admin/logs";

export function fetchAuditLogsList(query: AuditLogsListQuery) {
	return request
		.get(`${BASE}/`, { searchParams: query as Record<string, string | number | undefined> })
		.json<AuditLogsPaginatedResponse>();
}

export function fetchAuditLogDetail(id: number) {
	return request
		.get(`${BASE}/${id}/`)
		.json<AuditLogDto>();
}
