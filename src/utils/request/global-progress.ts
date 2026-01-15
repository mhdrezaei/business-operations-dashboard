import { useGlobalStore } from "#src/store";

// تعريف يک متغير سراسري براي شمارش درخواست هاي در حال اجرا
let requestCount = 0;

export const globalProgress = {
	/**
	 * شروع درخواست
	 *
	 * اگر شمارش درخواست صفر بود، لودينگ سراسري را نمايش بده و شمارش را يک واحد افزايش بده.
	 */
	start() {
		if (requestCount === 0) {
			// نمايش لودينگ سراسري
			useGlobalStore.getState().openGlobalSpin();
		}
		// افزايش شمارش درخواست
		requestCount++;
	},

	/**
	 * تابع پس از اتمام درخواست
	 *
	 * @description شمارش درخواست را يک واحد کم کن و مطمئن شو کمتر از صفر نشود؛
	 *              اگر شمارش صفر شد، لودينگ سراسري را پنهان کن
	 */
	done() {
		// کاهش شمارش درخواست با حداقل 0
		requestCount = Math.max(requestCount - 1, 0);
		if (requestCount === 0) {
			// پنهان کردن لودينگ سراسري
			useGlobalStore.getState().closeGlobalSpin();
		}
	},

	/**
	 * اتمام اجباري درخواست
	 *
	 * شمارش درخواست را مستقيما صفر کن و لودينگ سراسري را پنهان کن
	 */
	forceFinish() {
		// مستقيما شمارش درخواست را 0 کن
		requestCount = 0;
		// پنهان کردن لودينگ سراسري
		useGlobalStore.getState().closeGlobalSpin();
	},
};
