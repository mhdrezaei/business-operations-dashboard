import type { Options } from "ky";
import { refreshTokenPath } from "#src/api/user";

import { loginPath } from "#src/router/extra-info";
import { useAuthStore, usePreferencesStore } from "#src/store";
import ky from "ky";

import { AUTH_HEADER, LANG_HEADER } from "./constants";
import { handleErrorResponse } from "./error-response";
import { globalProgress } from "./global-progress";
import { goLogin } from "./go-login";
import { refreshTokenAndRetry } from "./refresh";

// فهرست سفيد درخواست ها؛ درخواست هاي داخل فهرست نيازي به token ندارند
const requestWhiteList = [loginPath];

// زمان پايان درخواست
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 10000;

const defaultConfig: Options = {
	// The input argument cannot start with a slash / when using prefixUrl option.
	prefixUrl: import.meta.env.VITE_API_BASE_URL,
	timeout: API_TIMEOUT,
	retry: {
		// حداکثر تعداد تلاش مجدد هنگام شکست درخواست
		limit: 3,
	},
	hooks: {
		beforeRequest: [
			(request, options) => {
				const ignoreLoading = options.ignoreLoading;
				if (!ignoreLoading) {
					globalProgress.start();
				}
				// درخواستي که نيازي به token ندارد
				const isWhiteRequest = requestWhiteList.some(url => request.url.endsWith(url));
				if (!isWhiteRequest) {
					const { token } = useAuthStore.getState();
					request.headers.set(AUTH_HEADER, `Bearer ${token}`);
				}
				// هدر زبان براي همه درخواست ها ارسال مي شود
				request.headers.set(LANG_HEADER, usePreferencesStore.getState().language);
			},
		],
		afterResponse: [
			async (request, options, response) => {
				const ignoreLoading = options.ignoreLoading;
				if (!ignoreLoading) {
					globalProgress.done();
				}
				// request error
				if (!response.ok) {
					if (response.status === 401) {
						// جلوگيري از حلقه بي نهايت 401 هنگام تازه سازي refresh-token
						if ([`/${refreshTokenPath}`].some(url => request.url.endsWith(url))) {
							goLogin();
							return response;
						}
						// If the token is expired, refresh it and try again.
						const { refreshToken } = useAuthStore.getState();
						// If there is no refresh token, it means that the user has not logged in.
						if (!refreshToken) {
							// اگر مسير صفحه به ورود ريدايرکت شده، ديگر تغيير مسير نده و نتيجه را برگردان
							if (location.pathname === loginPath) {
								return response;
							}
							else {
								goLogin();
								return response;
							}
						}

						return refreshTokenAndRetry(request, options, refreshToken);
					}
					else {
						return handleErrorResponse(response);
					}
				}
				// request success
				return response;
			},
		],
	},
};

export const request = ky.create(defaultConfig);
