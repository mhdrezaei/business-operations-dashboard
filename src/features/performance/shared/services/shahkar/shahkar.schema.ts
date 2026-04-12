import i18next from "i18next";
import { z } from "zod";
import { zNullableNonNegative } from "../../model/zod-helpers";

export const shahkarPerformanceSchema = z.object({
	performanceValue: zNullableNonNegative(i18next.t("performance.validation.shahkar.performanceValueRequired")),
});
