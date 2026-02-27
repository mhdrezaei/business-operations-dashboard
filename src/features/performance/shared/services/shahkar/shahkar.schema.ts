import { z } from "zod";
import { zNullableNonNegative } from "../../model/zod-helpers";

export const shahkarPerformanceSchema = z.object({
	performanceValue: zNullableNonNegative("مقدار عملکرد الزامی است"),
});
