import { z } from "zod";
import { zNullableNonNegative } from "../../model/zod-helpers";

export const pspPerformanceSchema = z.object({
	performanceValue: zNullableNonNegative("مقدار عملکرد الزامی است"),
	monthlyRevenue: zNullableNonNegative("درآمد این ماه الزامی است"),
});
