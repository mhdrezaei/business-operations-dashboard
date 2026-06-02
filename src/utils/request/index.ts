import type { Options } from "ky";
import { refreshTokenPath } from "#src/api/user";

import { loginPath } from "#src/router/extra-info";
import { useAuthStore } from "#src/store";
import ky from "ky";

import { AUTH_HEADER } from "./constants";
import { handleErrorResponse } from "./error-response";
import { globalProgress } from "./global-progress";
import { goLogin } from "./go-login";
import { refreshTokenAndRetry } from "./refresh";

// فهرست سفيد درخواست ها؛ درخواست هاي داخل فهرست نيازي به token ندارند
const requestWhiteList = [loginPath];

// زمان پايان درخواست
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 10000;
const RAW_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();

function normalizePrefixUrl(baseUrl: string) {
	if (!baseUrl)
		return "/api/v1/";

	if (/^https?:\/\//i.test(baseUrl)) {
		return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
	}

	const normalized = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;
	return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

type FetchInitWithRequestOptions = RequestInit & {
	ignoreLoading?: boolean
};

async function fetchWithGlobalProgress(input: RequestInfo | URL, init?: RequestInit) {
	const ignoreLoading = (init as FetchInitWithRequestOptions | undefined)?.ignoreLoading;
	if (!ignoreLoading) {
		globalProgress.start();
	}

	try {
		return await globalThis.fetch(input, init);
	}
	finally {
		if (!ignoreLoading) {
			globalProgress.done();
		}
	}
}

const defaultConfig: Options = {
	prefixUrl: normalizePrefixUrl(RAW_API_BASE_URL),
	timeout: API_TIMEOUT,
	fetch: fetchWithGlobalProgress,
	retry: {
		// حداکثر تعداد تلاش مجدد هنگام شکست درخواست
		limit: 3,
	},
	hooks: {
		beforeRequest: [
			(request) => {
				// درخواستي که نيازي به token ندارد
				const isWhiteRequest = requestWhiteList.some(url => request.url.endsWith(url));
				if (!isWhiteRequest) {
					const { access } = useAuthStore.getState();
					request.headers.set(AUTH_HEADER, `Bearer ${access}`);
				}
				// هدر زبان براي همه درخواست ها ارسال مي شود
				// request.headers.set(LANG_HEADER, usePreferencesStore.getState().language);
			},
		],
		afterResponse: [
			async (request, options, response) => {
				// request error
				if (!response.ok) {
					if (response.status === 401) {
						// جلوگيري از حلقه بي نهايت 401 هنگام تازه سازي refresh-token
						if ([`/${refreshTokenPath}`].some(url => request.url.endsWith(url))) {
							goLogin();
							return response;
						}
						// If the token is expired, refresh it and try again.
						const { refresh } = useAuthStore.getState();
						// If there is no refresh token, it means that the user has not logged in.
						if (!refresh) {
							// اگر مسير صفحه به ورود ريدايرکت شده، ديگر تغيير مسير نده و نتيجه را برگردان
							if (location.pathname === loginPath) {
								return response;
							}
							else {
								goLogin();
								return response;
							}
						}

						return refreshTokenAndRetry(request, options, refresh);
					}
					else {
						return handleErrorResponse(response, Boolean(options.suppressErrorNotification));
					}
				}
				// request success
				return response;
			},
		],
	},
};

export const request = ky.create(defaultConfig);
