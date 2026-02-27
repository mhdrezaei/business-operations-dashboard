import { z } from "zod";
import { zNullableNonNegative } from "../../model/zod-helpers";

export const smsPerformanceSchema = z.object({
	irancellFa: zNullableNonNegative("مقدار عملکرد ایرانسل - فارسی الزامی است"),
	irancellEn: zNullableNonNegative("مقدار عملکرد ایرانسل - انگلیسی الزامی است"),
	mciFa: zNullableNonNegative("مقدار عملکرد همراه اول - فارسی الزامی است"),
	mciEn: zNullableNonNegative("مقدار عملکرد همراه اول - انگلیسی الزامی است"),
	otherFa: zNullableNonNegative("مقدار عملکرد سایر - فارسی الزامی است"),
	otherEn: zNullableNonNegative("مقدار عملکرد سایر - انگلیسی الزامی است"),
});
