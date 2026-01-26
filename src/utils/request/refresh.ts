import type { KyResponse, Options } from "ky";

import { fetchRefreshToken } from "#src/api/user";
import { useAuthStore } from "#src/store";
import ky from "ky";
import { AUTH_HEADER } from "./constants";
import { goLogin } from "./go-login";

let isRefreshing = false;

/**
 * تازه سازي توکن و ارسال مجدد درخواست
 *
 * @param request شيء درخواست
 * @param options گزينه هاي درخواست
 * @param refreshToken توکن نوسازي
 * @returns شيء پاسخ
 * @throws در صورت شکست نوسازي توکن خطا پرتاب مي شود
 */
export async function refreshTokenAndRetry(request: Request, options: Options, refreshToken: string) {
	if (!isRefreshing) {
		isRefreshing = true;
		try {
			// فراخواني fetchRefreshToken با refreshToken براي دريافت token و refreshToken جديد
			const freshResponse = await fetchRefreshToken({ refreshToken });
			// استخراج token جديد از پاسخ
			const newToken = freshResponse.result.token;
			// استخراج refreshToken جديد از پاسخ
			const newRefreshToken = freshResponse.result.refreshToken;
			// ذخيره token و refreshToken جديد در userStore
			useAuthStore.setState({ access: newToken, refresh: newRefreshToken });
			// فراخواني onRefreshed با token جديد
			onRefreshed(newToken);

			// تنظيم هدر Authorization درخواست با token جديد
			// تلاش مجدد درخواست فعلي
			request.headers.set(AUTH_HEADER, `Bearer ${newToken}`);
			// ارسال دوباره درخواست با token جديد
			return ky(request, options);
		}
		catch (error) {
			// فراخواني onRefreshFailed با خطا
			// عدم تاييد refreshToken، رد کردن تمام درخواست هاي در انتظار
			onRefreshFailed(error);
			// رفتن به صفحه ورود
			goLogin();
			// پرتاب خطا
			throw error;
		}
		finally {
			// در هر صورت isRefreshing را false کن
			isRefreshing = false;
		}
	}
	else {
		// منتظر اتمام تازه سازي token
		return new Promise<KyResponse>((resolve, reject) => {
			// افزودن مشترک تازه سازي
			addRefreshSubscriber({
				// پس از موفقيت تازه سازي token، هدر Authorization را به روز کن و درخواست را دوباره بفرست
				resolve: async (newToken) => {
					request.headers.set(AUTH_HEADER, `Bearer ${newToken}`);
					resolve(ky(request, options));
				},
				// اگر تازه سازي token ناموفق شد، Promise فعلي را رد کن
				reject,
			});
		});
	}
}

// آرايه اي براي نگهداري تمام مشترک هاي منتظر تازه سازي token
// هر مشترک شامل resolve و reject است که به ترتيب در موفقيت/شکست فراخواني مي شوند
let refreshSubscribers: Array<{
	resolve: (token: string) => void // تابع فراخواني در موفقيت تازه سازي token با token جديد
	reject: (error: any) => void // تابع فراخواني در شکست تازه سازي token با خطا
}> = [];

/**
 * هنگام موفقيت تازه سازي token، به همه مشترک هاي منتظر خبر بده.
 * همه مشترک ها را مرور کن و resolve را با token جديد صدا بزن.
 * سپس ليست مشترک ها را خالي کن تا براي بار بعد آماده شود.
 *
 * @param token رشته توکن تازه سازي شده
 */
function onRefreshed(token: string) {
	refreshSubscribers.forEach(subscriber => subscriber.resolve(token));
	refreshSubscribers = []; // خالي کردن ليست مشترک ها
}

/**
 * هنگام شکست تازه سازي token، به همه مشترک هاي منتظر خبر بده.
 * همه مشترک ها را مرور کن و reject را با خطا صدا بزن.
 * سپس ليست مشترک ها را خالي کن.
 *
 * @param error خطاي ايجاد شده هنگام شکست تازه سازي
 */
function onRefreshFailed(error: any) {
	refreshSubscribers.forEach(subscriber => subscriber.reject(error));
	refreshSubscribers = []; // خالي کردن ليست مشترک ها
}

/**
 * افزودن يک مشترک جديد به ليست.
 * مشترک بايد شامل resolve و reject باشد.
 *
 * @param subscriber شيء مشترک شامل resolve و reject
 */
function addRefreshSubscriber(subscriber: {
	resolve: (token: string) => void // تابع فراخواني هنگام موفقيت تازه سازي token
	reject: (error: any) => void // تابع فراخواني هنگام شکست تازه سازي token
}) {
	refreshSubscribers.push(subscriber); // افزودن مشترک جديد به ليست
}
