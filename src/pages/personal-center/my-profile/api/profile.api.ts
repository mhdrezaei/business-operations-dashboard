import type { MyProfileFormValues } from "../model/profile.schema";
import { request } from "#src/utils/request/";

export interface ProfilePayload {
	id?: number
	first_name?: string | null
	last_name?: string | null
	username?: string | null
	email?: string | null
	mobile?: string | null
	national_code?: string | null
	otp_code?: string
	mobile_otp_code?: string
}
export interface ProfileUpdateResult {
	status: number
	data?: MyProfileFormValues
	errorMessage?: string
}

function extractFirstErrorMessage(value: unknown): string | undefined {
	if (typeof value === "string") {
		const text = value.trim();
		return text || undefined;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			const message = extractFirstErrorMessage(item);
			if (message)
				return message;
		}
		return undefined;
	}

	if (value && typeof value === "object") {
		const record = value as Record<string, unknown>;
		for (const key of ["errorMsg", "message", "detail", "error", "non_field_errors"]) {
			const message = extractFirstErrorMessage(record[key]);
			if (message)
				return message;
		}

		for (const key of Object.keys(record)) {
			const message = extractFirstErrorMessage(record[key]);
			if (message)
				return message;
		}
	}

	return undefined;
}

export async function fetchProfile() {
	return request
		.get("auth/me/")
		.json<MyProfileFormValues>();
}
export async function updateProfile(payload: ProfilePayload) {
	const response = await request.put("auth/me/update/", {
		json: payload,
		retry: { limit: 0 },
		suppressErrorNotification: true,
		throwHttpErrors: false,
	});
	const body = await response.json<unknown>().catch(() => undefined);

	return {
		status: response.status,
		data: response.ok ? body as MyProfileFormValues : undefined,
		errorMessage: response.ok ? undefined : extractFirstErrorMessage(body),
	};
}
