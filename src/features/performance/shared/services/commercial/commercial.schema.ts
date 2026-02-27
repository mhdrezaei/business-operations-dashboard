import { z } from "zod";

const uploadFileListSchema = z.array(z.any()).default([]);

export const commercialPerformanceSchema = z
	.object({
		servicesFile: uploadFileListSchema,
		provinceCodeFile: uploadFileListSchema,
		monthlyPerformanceFile: uploadFileListSchema,
	})
	.superRefine((value, ctx) => {
		if (!Array.isArray(value.servicesFile) || value.servicesFile.length < 1) {
			ctx.addIssue({
				code: "custom",
				path: ["servicesFile"],
				message: "فایل سرویس‌ها الزامی است",
			});
		}
		if (!Array.isArray(value.provinceCodeFile) || value.provinceCodeFile.length < 1) {
			ctx.addIssue({
				code: "custom",
				path: ["provinceCodeFile"],
				message: "فایل کد استانی الزامی است",
			});
		}
		if (!Array.isArray(value.monthlyPerformanceFile) || value.monthlyPerformanceFile.length < 1) {
			ctx.addIssue({
				code: "custom",
				path: ["monthlyPerformanceFile"],
				message: "فایل عملکرد ماهانه الزامی است",
			});
		}
	});
