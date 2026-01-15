import { useAuthStore } from "#src/store";
import { rememberRoute } from "#src/utils";

/**
 * رفتن به صفحه ورود
 *
 * @returns بازگشتي ندارد
 */
export function goLogin() {
	// بازنشاني وضعيت ورود
	useAuthStore.getState().reset();
	// رفتن به صفحه ورود همراه با مسير ذخيره شده
	window.location.href = `${import.meta.env.BASE_URL}login${rememberRoute()}`;
}
