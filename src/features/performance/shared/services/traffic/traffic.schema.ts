import { z } from "zod";

const uploadFileListSchema = z.array(z.any()).default([]);

export const trafficPerformanceSchema = z.object({
	monthlyPerformanceFile: uploadFileListSchema,
}).superRefine((value, ctx) => {
	if (!Array.isArray(value.monthlyPerformanceFile) || value.monthlyPerformanceFile.length < 1) {
		ctx.addIssue({
			code: "custom",
			path: ["monthlyPerformanceFile"],
			message: "فایل عملکرد ماهانه الزامی است",
		});
	}
});
