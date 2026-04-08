import { z } from "zod";
import { zNullableNonNegative } from "../../model/zod-helpers";

const uploadFileListSchema = z.array(z.any()).default([]);

export const trafficPerformanceSchema = z.object({
	submitMode: z.enum(["template", "single"]).default("template"),
	monthlyPerformanceFile: uploadFileListSchema,
	tehranValue: zNullableNonNegative("مقدار ترافیک ارسالی تهران الزامی است"),
	tehranValueReceive: zNullableNonNegative("مقدار ترافیک دریافتی تهران الزامی است"),
	countyEnabled: z.boolean().default(true),
	countyValue: zNullableNonNegative("مقدار ترافیک ارسالی مراکز استان الزامی است"),
	countyValueReceive: zNullableNonNegative("مقدار ترافیک دریافتی مراکز استان الزامی است"),
}).superRefine((value, ctx) => {
	if (value.submitMode === "template") {
		if (!Array.isArray(value.monthlyPerformanceFile) || value.monthlyPerformanceFile.length < 1) {
			ctx.addIssue({
				code: "custom",
				path: ["monthlyPerformanceFile"],
				message: "فایل عملکرد ماهانه الزامی است",
			});
		}
		return;
	}

	if (value.tehranValue == null) {
		ctx.addIssue({
			code: "custom",
			path: ["tehranValue"],
			message: "مقدار ترافیک ارسالی تهران الزامی است",
		});
	}

	if (value.tehranValueReceive == null) {
		ctx.addIssue({
			code: "custom",
			path: ["tehranValueReceive"],
			message: "مقدار ترافیک دریافتی تهران الزامی است",
		});
	}

	if (value.countyEnabled) {
		if (value.countyValue == null) {
			ctx.addIssue({
				code: "custom",
				path: ["countyValue"],
				message: "مقدار ترافیک ارسالی مراکز استان الزامی است",
			});
		}

		if (value.countyValueReceive == null) {
			ctx.addIssue({
				code: "custom",
				path: ["countyValueReceive"],
				message: "مقدار ترافیک دریافتی مراکز استان الزامی است",
			});
		}
	}
});
