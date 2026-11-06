import { useAuthStore } from "#src/store";
import { rememberRoute } from "#src/utils";

/**
 * رفتن به صفحه ورود
 *
 * @returns بازگشتي ندارد
 */
export function goLogin() {
	// مسير فعلي بايد پيش از بازنشاني وضعيت ورود ذخيره شود، چون guard مسير ممکن است همان لحظه به /login برود
	const redirect = rememberRoute();
	useAuthStore.getState().reset();
	window.location.href = `${import.meta.env.BASE_URL}login${redirect}`;
}
