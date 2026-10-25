import i18next from "i18next";
import { z } from "zod";
import { emptyToNull, zNullableNonNegative } from "../../model/zod-helpers";
import { COLLOCATION_PARTNER_TYPES, COLLOCATION_ROW_METRICS } from "./traffic-collocation";

const uploadFileListSchema = z.array(z.any()).default([]);

function zNullableConversionRatio() {
	const rangeMsg = i18next.t("performance.validation.traffic.conversionRatioRange");
	return z.preprocess(
		emptyToNull,
		z.coerce.number().min(0, rangeMsg).max(10, rangeMsg)
			.refine(v => Math.abs(Math.round(v * 1000) / 1000 - v) < 1e-9, i18next.t("performance.validation.traffic.conversionRatioDecimals"))
			.nullable(),
	).default(null);
}

const collocationRowSchema = z.object({
	datacenter: z.number(),
	datacenterName: z.string(),
	ipCount: zNullableNonNegative(i18next.t("performance.validation.traffic.collocationFieldRequired")),
	bandwidthUsed: zNullableNonNegative(i18next.t("performance.validation.traffic.collocationFieldRequired")),
	ampereUsed: zNullableNonNegative(i18next.t("performance.validation.traffic.collocationFieldRequired")),
});

export const trafficPerformanceSchema = z.object({
	submitMode: z.enum(["template", "single"]).default("template"),
	monthlyPerformanceFile: uploadFileListSchema,
	tehranValue: zNullableNonNegative(i18next.t("performance.validation.traffic.tehranValueRequired")),
	tehranValueReceive: zNullableNonNegative(i18next.t("performance.validation.traffic.tehranValueReceiveRequired")),
	tehranConversionRatio: zNullableConversionRatio(),
	tehranEnabled: z.boolean().default(true),
	countyEnabled: z.boolean().default(false),
	countyValue: zNullableNonNegative(i18next.t("performance.validation.traffic.countyValueRequired")),
	countyValueReceive: zNullableNonNegative(i18next.t("performance.validation.traffic.countyValueReceiveRequired")),
	countyConversionRatio: zNullableConversionRatio(),
	collocationMode: z.enum(COLLOCATION_PARTNER_TYPES).nullable().default(null),
	collocationRows: z.array(collocationRowSchema).default([]),
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

	if (value.collocationMode != null) {
		if (value.collocationRows.length < 1) {
			ctx.addIssue({
				code: "custom",
				path: ["collocationRows"],
				message: i18next.t("performance.traffic.collocation.noActiveContract"),
			});
		}
		value.collocationRows.forEach((row, index) => {
			COLLOCATION_ROW_METRICS.filter(metric => row[metric] == null).forEach((metric) => {
				ctx.addIssue({
					code: "custom",
					path: ["collocationRows", index, metric],
					message: i18next.t("performance.validation.traffic.collocationFieldRequired"),
				});
			});
		});
		return;
	}

	if (value.tehranEnabled) {
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
