/**
 * اگر در جاهاي ديگر از مسيرها استفاده مي شود، path را جدا کنيد تا نگهداري آسان شود
 * براي جلوگيري از فراموشي تغيير path در ساير بخش ها
 */

export const loginPath = "/login";
export const privacyPolicyPath = "/privacy-policy";
export const termsOfServicePath = "/terms-of-service";

export const exceptionPath = "/exception";
export const exception403Path = `${exceptionPath}/403`;
export const exception404Path = `${exceptionPath}/404`;
export const exception500Path = `${exceptionPath}/500`;
export const exceptionUnknownComponentPath = `${exceptionPath}/not-found-component`;
