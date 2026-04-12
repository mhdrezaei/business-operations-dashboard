import type { PasswordLoginFormType } from "#src/pages/login/components/password-login";
import type { AppRouteRecordRaw } from "#src/router/types";
import type { AuditAccessType, AuthType, UserInfoType } from "./types";
import { request } from "#src/utils";

export * from "./types";

export function fetchLogin(data: PasswordLoginFormType) {
	return request
		.post("auth/login/", { json: data })
		.json<AuthType>();
}

export function fetchLogout() {
	return request.post("logout").json();
}

export function fetchAsyncRoutes() {
	return request.get("get-async-routes").json<ApiResponse<AppRouteRecordRaw[]>>();
}

export function fetchUserInfo() {
	return request.get("auth/me").json<UserInfoType>();
}

export function fetchAuditAccess() {
	return request.get("audit/access/").json<AuditAccessType>();
}

export const refreshTokenPath = "auth/refresh/";
export function fetchRefreshToken(data: { readonly refresh: string }) {
	return request.post(refreshTokenPath, { json: data }).json<AuthType>();
}
export const requestOtpPath = "auth/request-otp/";
export function fetchRequestOtp(data: { mobile: string }) {
	// اگر API بدنه برنمی‌گرداند، json را هم می‌توان حذف کرد؛
	// اما این شکل با بقیه فایل شما یکدست است.
	return request
		.post(requestOtpPath, { json: data })
		.json();
}

export const otpLoginPath = "auth/otp-login/";
export function fetchOtpLogin(data: { mobile: string, otp_code: string }) {
	return request
		.post(otpLoginPath, { json: data })
		.json<AuthType>();
}

// --- Forgot Password (additions) ---

export const forgotPasswordRequestPath = "auth/forgot-password/request/";
export function fetchForgotPasswordRequest(data: { mobile: string }) {
	// ممکنه response body نداشته باشه؛ برای همین catch گذاشتیم
	return request
		.post(forgotPasswordRequestPath, { json: data })
		.json()
		.catch(() => undefined);
}

export const forgotPasswordConfirmPath = "auth/forgot-password/confirm/";
export function fetchForgotPasswordConfirm(data: {
	mobile: string
	otp_code: string
	new_password: string
}) {
	return request
		.post(forgotPasswordConfirmPath, { json: data })
		.json()
		.catch(() => undefined);
}
