import type { AuditLogDto, AuditLogJsonObject, AuditLogJsonValue } from "./admin-logs.types";

const SENSITIVE_KEY_PATTERNS = [
	"password",
	"pass",
	"token",
	"access",
	"refresh",
	"secret",
	"otp",
	"otp_code",
	"authorization",
	"cookie",
	"session",
];

export function formatAuditLogCreatedAt(value?: string | null): string {
	if (!value) {
		return "-";
	}

	const parsedDate = new Date(value);
	if (Number.isNaN(parsedDate.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(parsedDate);
}

export function formatAuditLogActor(log: AuditLogDto): string {
	if (log.actor_username?.trim()) {
		return log.actor_username.trim();
	}

	if (log.actor != null) {
		return `کاربر #${log.actor}`;
	}

	return "ناشناس";
}

export function getAuditLogMethodColor(method?: string | null): string {
	switch (method?.toUpperCase()) {
		case "GET":
			return "blue";
		case "POST":
			return "green";
		case "PUT":
		case "PATCH":
			return "orange";
		case "DELETE":
			return "red";
		default:
			return "default";
	}
}

export function getAuditLogStatusColor(statusCode?: number | null): string {
	if (statusCode == null) {
		return "default";
	}

	if (statusCode >= 200 && statusCode < 300) {
		return "green";
	}

	if (statusCode >= 300 && statusCode < 400) {
		return "blue";
	}

	if (statusCode >= 400 && statusCode < 500) {
		return "orange";
	}

	if (statusCode >= 500) {
		return "red";
	}

	return "default";
}

function isSensitiveKey(key: string): boolean {
	const normalizedKey = key.trim().toLowerCase();
	return SENSITIVE_KEY_PATTERNS.some(pattern => normalizedKey.includes(pattern));
}

export function sanitizeAuditLogJson(value: AuditLogJsonValue | AuditLogJsonObject | undefined): AuditLogJsonValue | undefined {
	if (Array.isArray(value)) {
		return value.map(item => sanitizeAuditLogJson(item) ?? null);
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				isSensitiveKey(key) ? "********" : (sanitizeAuditLogJson(item) ?? null),
			]),
		);
	}

	return value;
}

export function formatAuditLogJson(value: AuditLogJsonValue | AuditLogJsonObject | undefined): string {
	if (value == null) {
		return "{}";
	}

	return JSON.stringify(sanitizeAuditLogJson(value), null, 2);
}
