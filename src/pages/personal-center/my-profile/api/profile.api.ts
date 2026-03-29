import type { MyProfileFormValues } from "../model/profile.form.types";
import { request } from "#src/utils/request/";

export interface ProfilePayload {
	id?: number
	first_name: string
	last_name: string
	username: string
	email: string
	mobile: string
	national_code: string
}
export async function fetchProfile() {
	return request
		.get("auth/me")
		.json<MyProfileFormValues>();
}
export async function updateProfile(payload: ProfilePayload) {
	return request
		.put("auth/me/update/", { json: payload })
		.json<MyProfileFormValues>();
}
