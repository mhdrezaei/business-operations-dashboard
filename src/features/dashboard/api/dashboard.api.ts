import type { HomeDashboardResponse, WidgetKey, WidgetListItem, WidgetResponseMap } from "./dashboard.dto";
import { request } from "#src/utils/request";

export type WidgetParams = Record<string, string | number | undefined | null>;

/** Error of a dashboard request; `message` is the first backend message (400 bodies are `{ param: "message" }`). */
export class DashboardRequestError extends Error {
	constructor(message: string, readonly status: number) {
		super(message);
		this.name = "DashboardRequestError";
	}
}

function toSearchParams(params: WidgetParams = {}) {
	const searchParams: Record<string, string> = {};
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== "")
			searchParams[key] = String(value);
	}
	return searchParams;
}

function firstMessage(body: unknown): string | null {
	if (typeof body === "string")
		return body.trim() || null;
	if (Array.isArray(body))
		return body.map(firstMessage).find(Boolean) ?? null;
	if (body && typeof body === "object")
		return Object.values(body).map(firstMessage).find(Boolean) ?? null;
	return null;
}

/**
 * Errors are shown inside each card, so the global toast is suppressed.
 * 404 is not an error: the widget key does not exist or the user lacks access (deliberately indistinguishable),
 * both mean "do not show" → `null`.
 */
async function getJson<T>(path: string, params?: WidgetParams, nullOn404 = false): Promise<T | null> {
	const response = await request.get(path, {
		searchParams: toSearchParams(params),
		suppressErrorNotification: true,
		throwHttpErrors: false,
	});
	if (nullOn404 && response.status === 404)
		return null;
	if (!response.ok) {
		const body = await response.json().catch(() => null);
		throw new DashboardRequestError(firstMessage(body) ?? response.statusText, response.status);
	}
	return response.json<T>();
}

export async function fetchHomeDashboard(serviceIds: string | undefined) {
	return (await getJson<HomeDashboardResponse>("home/dashboard/", { service_ids: serviceIds }))!;
}

export async function fetchHomeWidgets() {
	const data = await getJson<WidgetListItem[]>("home/widgets/");
	return Array.isArray(data) ? data : [];
}

export function fetchHomeWidgetData<K extends WidgetKey>(key: K, params?: WidgetParams) {
	return getJson<WidgetResponseMap[K]>(`home/widgets/${key}/`, params, true);
}
