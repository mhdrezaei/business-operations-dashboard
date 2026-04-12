import i18next from "i18next";
import { z } from "zod";
import { zNullableNonNegative } from "../../model/zod-helpers";

export const pspPerformanceSchema = z.object({
	performanceValue: zNullableNonNegative(i18next.t("performance.validation.psp.performanceValueRequired")),
	monthlyRevenue: zNullableNonNegative(i18next.t("performance.validation.psp.monthlyRevenueRequired")),
});
