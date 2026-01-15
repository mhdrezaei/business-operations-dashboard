import { isObject, message } from "#src/utils";

/**
 * پردازش پاسخ خطا
 *
 * @param response شيء پاسخ
 * @returns شيء پاسخ
 */
export async function handleErrorResponse(response: Response) {
	try {
		// تجزيه محتواي پاسخ به JSON
		const data = await response.json();

		// بررسي اينکه داده تجزيه شده از نوع شيء است
		if (isObject(data)) {
			// تبديل داده تجزيه شده به شيء شامل اطلاعات خطا
			const json = data as { errorMsg?: string, message?: string };

			// اگر داده شامل errorMsg يا message باشد، خطا را نمايش بده
			// در غير اين صورت متن وضعيت پاسخ را نمايش بده
			message.error(json.errorMsg || json.message || response.statusText);
		}
		else {
			// اگر داده از نوع شيء نبود، متن وضعيت پاسخ را نمايش بده
			message.error(response.statusText);
		}
	}
	catch (e) {
		// اگر تجزيه JSON خطا داشت، خطا را در کنسول چاپ کن
		console.error("Error parsing JSON:", e);

		// متن وضعيت پاسخ را به عنوان خطا نمايش بده
		message.error(response.statusText);
	}

	// بازگرداندن شيء پاسخ
	return response;
}
