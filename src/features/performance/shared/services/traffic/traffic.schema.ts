import i18next from "i18next";
import { z } from "zod";
import { emptyToNull, zNullableNonNegative } from "../../model/zod-helpers";

const uploadFileListSchema = z.array(z.any()).default([]);

function zNullableConversionRatio() {
	const rangeMsg = i18next.t("performance.validation.traffic.conversionRatioRange");
	return z.preprocess(
		emptyToNull,
		z.coerce.number().min(0, rangeMsg).max(10, rangeMsg).nullable(),
	).default(null);
}

export const trafficPerformanceSchema = z.object({
	submitMode: z.enum(["template", "single"]).default("template"),
	monthlyPerformanceFile: uploadFileListSchema,
	tehranValue: zNullableNonNegative(i18next.t("performance.validation.traffic.tehranValueRequired")),
	tehranValueReceive: zNullableNonNegative(i18next.t("performance.validation.traffic.tehranValueReceiveRequired")),
	tehranConversionRatio: zNullableConversionRatio(),
	countyEnabled: z.boolean().default(false),
	countyValue: zNullableNonNegative(i18next.t("performance.validation.traffic.countyValueRequired")),
	countyValueReceive: zNullableNonNegative(i18next.t("performance.validation.traffic.countyValueReceiveRequired")),
	countyConversionRatio: zNullableConversionRatio(),
}).superRefine((value, ctx) => {
	if (value.submitMode === "template") {
		if (!Array.isArray(value.monthlyPerformanceFile) || value.monthlyPerformanceFile.length < 1) {
			ctx.addIssue({
				code: "custom",
				path: ["monthlyPerformanceFile"],
				message: i18next.t("performance.validation.traffic.monthlyPerformanceFileRequired"),
			});
		}
		return;
	}

	if (value.tehranValue == null) {
		ctx.addIssue({
			code: "custom",
			path: ["tehranValue"],
			message: i18next.t("performance.validation.traffic.tehranValueRequired"),
		});
	}

	if (value.tehranValueReceive == null) {
		ctx.addIssue({
			code: "custom",
			path: ["tehranValueReceive"],
			message: i18next.t("performance.validation.traffic.tehranValueReceiveRequired"),
		});
	}

	if (value.countyEnabled) {
		if (value.countyValue == null) {
			ctx.addIssue({
				code: "custom",
				path: ["countyValue"],
				message: i18next.t("performance.validation.traffic.countyValueRequired"),
			});
		}

		if (value.countyValueReceive == null) {
			ctx.addIssue({
				code: "custom",
				path: ["countyValueReceive"],
				message: i18next.t("performance.validation.traffic.countyValueReceiveRequired"),
			});
		}
	}
});
