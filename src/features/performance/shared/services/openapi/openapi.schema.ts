import i18next from "i18next";
import { z } from "zod";
import { zNullableNonNegative } from "../../model/zod-helpers";

export const openapiPerformanceSchema = z.object({
	billInquiryValue: zNullableNonNegative(i18next.t("performance.validation.openapi.billInquiryValueRequired")),
	receiptRegisterValue: zNullableNonNegative(i18next.t("performance.validation.openapi.receiptRegisterValueRequired")),
	trafficRevenue: zNullableNonNegative(i18next.t("performance.validation.openapi.trafficRevenueRequired")),
	trafficPackageCount: zNullableNonNegative(i18next.t("performance.validation.openapi.trafficPackageCountRequired")),
	irancellFa: zNullableNonNegative(i18next.t("performance.validation.sms.irancellFaRequired")),
	irancellEn: zNullableNonNegative(i18next.t("performance.validation.sms.irancellEnRequired")),
	mciFa: zNullableNonNegative(i18next.t("performance.validation.sms.mciFaRequired")),
	mciEn: zNullableNonNegative(i18next.t("performance.validation.sms.mciEnRequired")),
	otherFa: zNullableNonNegative(i18next.t("performance.validation.sms.otherFaRequired")),
	otherEn: zNullableNonNegative(i18next.t("performance.validation.sms.otherEnRequired")),
});
