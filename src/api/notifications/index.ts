import type {
	NotificationInboxDto,
	NotificationInboxQuery,
	NotificationInboxResponse,
	NotificationItem,
	NotificationMarkReadPayload,
	NotificationMarkStatePayload,
} from "./types";
import { useAuthStore, useUserStore } from "#src/store";
import { request } from "#src/utils/request";

function compactSearchParams(params: Record<string, unknown>) {
	const output: Record<string, string> = {};
	Object.entries(params).forEach(([key, value]) => {
		if (value == null || value === "")
			return;
		output[key] = String(value);
	});
	return output;
}

function pickStringFromRecord(record: Record<string, unknown>, keys: string[]) {
	for (const key of keys) {
		const value = record[key];
		if (value == null)
			continue;
		const text = String(value).trim();
		if (text)
			return text;
	}
	return "";
}

function pickBooleanFromRecord(record: Record<string, unknown>, keys: string[]) {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "boolean")
			return value;
	}
	return false;
}

function decodeJwtPayload(token: string) {
	try {
		const [, payload = ""] = token.split(".");
		if (!payload)
			return null;

		const normalized = payload
			.replace(/-/g, "+")
			.replace(/_/g, "/")
			.padEnd(Math.ceil(payload.length / 4) * 4, "=");

		const decoded = globalThis.atob(normalized);
		return JSON.parse(decoded) as Record<string, unknown>;
	}
	catch {
		return null;
	}
}

function getExternalUserId() {
	const userId = String(useUserStore.getState().id ?? "").trim();
	if (userId)
		return userId;

	const accessToken = String(useAuthStore.getState().access ?? "").trim();
	if (!accessToken)
		return "";

	const payload = decodeJwtPayload(accessToken);
	return String(payload?.user_id ?? "").trim();
}

function getExternalUserIdHeader() {
	const userId = getExternalUserId();
	if (!userId)
		return undefined;

	return {
		"X-External-User-Id": userId,
	};
}

function toPositiveInt(value: unknown) {
	const numeric = Number(value);
	return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function normalizeNotificationItem(rawItem: NotificationInboxDto): NotificationItem {
	const record = rawItem as Record<string, unknown>;
	const id = toPositiveInt(record.id) ?? Date.now();
	const title = pickStringFromRecord(record, ["title", "subject"]) || "بدون عنوان";
	const message = pickStringFromRecord(record, ["message", "description", "body", "text", "content"]) || "-";
	const createdAt = pickStringFromRecord(record, ["created_at", "createdAt", "date", "sent_at"]);
	const type = pickStringFromRecord(record, ["event_type", "notification_type", "type"]) || null;
	const avatar = pickStringFromRecord(record, ["avatar", "image"]) || null;
	const hasReadAt = pickStringFromRecord(record, ["read_at"]) !== "";
	const isRead = hasReadAt || pickBooleanFromRecord(record, ["is_read", "read"]);

	return {
		id,
		title,
		message,
		isRead,
		createdAt,
		type,
		avatar,
		raw: rawItem,
	};
}

function toInboxResponse(raw: unknown): NotificationInboxResponse {
	const source = (raw ?? {}) as Record<string, unknown>;
	const resultsRaw
		= Array.isArray(source.results)
			? source.results
			: Array.isArray(source.result)
				? source.result
				: Array.isArray(raw)
					? raw
					: [];

	const normalized = (resultsRaw as NotificationInboxDto[]).map(normalizeNotificationItem);
	const countValue = Number(source.count);
	const count = Number.isFinite(countValue) ? countValue : normalized.length;

	return {
		count,
		next: (source.next as string | null | undefined) ?? null,
		previous: (source.previous as string | null | undefined) ?? null,
		results: normalized,
		unread_count: Number.isFinite(Number(source.unread_count))
			? Number(source.unread_count)
			: null,
	};
}

export async function fetchNotificationInbox(params: NotificationInboxQuery = {}) {
	const response = await request
		.get("notifications/inbox/", {
			headers: getExternalUserIdHeader(),
			searchParams: compactSearchParams(params as unknown as Record<string, unknown>),
		})
		.json<unknown>();

	return toInboxResponse(response);
}

export async function markNotificationInboxRead(payload: NotificationMarkReadPayload) {
	await markNotificationInboxState({ ...payload, isRead: true });
}

export async function markNotificationInboxState(payload: NotificationMarkStatePayload) {
	const ids = (payload.ids ?? []).filter(id => Number.isInteger(id) && id > 0);
	if (ids.length === 0)
		return;

	const headers = getExternalUserIdHeader();
	if (payload.isRead) {
		await request.post("notifications/inbox/mark-read/", {
			headers,
			json: { ids },
		});
		return;
	}

	const attempts = [
		() =>
			request.post("notifications/inbox/mark-unread/", {
				headers,
				json: { ids },
			}),
		() =>
			request.post("notifications/inbox/mark-read/", {
				headers,
				json: { ids, is_read: false },
			}),
		() =>
			request.patch("notifications/inbox/mark-read/", {
				headers,
				json: { ids, is_read: false },
			}),
	];

	let lastError: unknown = null;
	for (const runAttempt of attempts) {
		try {
			await runAttempt();
			return;
		}
		catch (error) {
			lastError = error;
		}
	}

	throw lastError;
}
