import { z } from "zod";
import { zNullableNonNegative } from "../../model/zod-helpers";

export const openapiPerformanceSchema = z.object({
	billInquiryValue: zNullableNonNegative("مقدار عملکرد استعلام قبض را وارد کنید"),
	receiptRegisterValue: zNullableNonNegative("مقدار عملکرد ثبت وصولی را وارد کنید"),
	trafficRevenue: zNullableNonNegative("درآمد ترافیک را وارد کنید"),
	trafficPackageCount: zNullableNonNegative("تعداد بسته ترافیک را وارد کنید"),
	irancellFa: zNullableNonNegative("مقدار عملکرد ایرانسل - فارسی را وارد کنید"),
	irancellEn: zNullableNonNegative("مقدار عملکرد ایرانسل - انگلیسی را وارد کنید"),
	mciFa: zNullableNonNegative("مقدار عملکرد همراه اول - فارسی را وارد کنید"),
	mciEn: zNullableNonNegative("مقدار عملکرد همراه اول - انگلیسی را وارد کنید"),
	otherFa: zNullableNonNegative("مقدار عملکرد سایر - فارسی را وارد کنید"),
	otherEn: zNullableNonNegative("مقدار عملکرد سایر - انگلیسی را وارد کنید"),
});
