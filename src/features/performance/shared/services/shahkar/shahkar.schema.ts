import i18next from "i18next";
import { z } from "zod";
import { zNullableNonNegative } from "../../model/zod-helpers";

export const shahkarPerformanceSchema = z.object({
	performanceValue: zNullableNonNegative(i18next.t("performance.validation.shahkar.performanceValueRequired")),
	hasNewCustomerRate: z.boolean().optional(),
	newCustomerCount: zNullableNonNegative(i18next.t("performance.validation.shahkar.newCustomerCountInvalid"))
		.refine(value => value == null || Number.isInteger(value), {
			message: i18next.t("performance.validation.shahkar.newCustomerCountInvalid"),
		}),
});
