export type MobileOtpStep = "current" | "new";

export function translateMobileOtpError(message?: string) {
	const normalized = message?.trim() ?? "";

	if (/mobile-change request/i.test(normalized) && /current mobile verification stage/i.test(normalized)) {
		return "برای این شماره یک درخواست تغییر شماره باز مانده است. کدی را که برای شماره قبلی ارسال شده وارد کنید یا کمی بعد دوباره تلاش کنید.";
	}

	if (/mobile-change request/i.test(normalized) && /new mobile verification stage/i.test(normalized)) {
		return "درخواست تغییر شماره در مرحله تایید شماره جدید است. کدی را که برای شماره جدید ارسال شده وارد کنید یا کمی بعد دوباره تلاش کنید.";
	}

	if (/otp/i.test(normalized) || /code/i.test(normalized))
		return "کد تایید درست نیست یا منقضی شده است. لطفا کد جدید را دوباره وارد کنید.";

	return normalized || "در حال حاضر امکان تایید شماره وجود ندارد. لطفا دوباره تلاش کنید.";
}

export function isPendingCurrentMobileStage(message?: string) {
	return /mobile-change request/i.test(message ?? "") && /current mobile verification stage/i.test(message ?? "");
}

export function isPendingNewMobileStage(message?: string) {
	return /mobile-change request/i.test(message ?? "") && /new mobile verification stage/i.test(message ?? "");
}
