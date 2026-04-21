import type {
	PredictionShareSectionValue,
	TrafficLocationCode,
	TrafficPredictionServiceFields,
} from "../../model/prediction.form.types";
import i18next from "i18next";
import { z } from "zod";
import {
	createEmptyTrafficManualShares,
	isTrafficLocationCode,
	TRAFFIC_COMPANY_TYPE_OPTIONS,
	TRAFFIC_LOCATION_OPTIONS,
	TRAFFIC_METRICS,
} from "./traffic.config";

function nullableNonNegativeNumber() {
	return z.number().nullable().refine(value => value == null || value >= 0, {
		message: i18next.t("prediction.validation.traffic.nonNegativeNumber"),
	});
}

const quarterRangeMessage = i18next.t("prediction.validation.quarters.range", {
	defaultValue: "درصد هر کوارتر باید بین 0 تا 100 باشد",
});

const quarterPercentSchema = z.number()
	.int({ message: quarterRangeMessage })
	.min(0, { message: quarterRangeMessage })
	.max(100, { message: quarterRangeMessage })
	.nullable();

const shareSectionSchema = z.object({
	mode: z.enum(["auto", "manual"]),
	selectedCompanyIds: z.array(z.number().int().positive()),
	shares: z.record(z.string(), z.number().nullable()),
});

const trafficLocationSchema = z.object({
	location: z.enum(TRAFFIC_LOCATION_OPTIONS.map(option => option.value) as [TrafficLocationCode, ...TrafficLocationCode[]]).nullable(),
	valueYear: nullableNonNegativeNumber(),
	valueReceiveYear: nullableNonNegativeNumber(),
	incomeYear: nullableNonNegativeNumber(),
	expenseYear: nullableNonNegativeNumber(),
});

function getShareTotal(section: PredictionShareSectionValue) {
	return section.selectedCompanyIds.reduce((total, companyId) => {
		const amount = section.shares[String(companyId)] ?? 0;
		return Number(total) + Number(amount ?? 0);
	}, 0);
}

export const trafficPredictionSchema = z.object({
	companyType: z.enum(TRAFFIC_COMPANY_TYPE_OPTIONS.map(option => option.value) as ["CP", "IXP", "TCI", "PREMIUM"]).nullable(),
	q1Percent: quarterPercentSchema,
	q2Percent: quarterPercentSchema,
	q3Percent: quarterPercentSchema,
	q4Percent: quarterPercentSchema,
	locations: z.array(trafficLocationSchema).default([]),
	manualShares: z.object({
		TEHRAN: z.object({
			value: shareSectionSchema,
			valueReceive: shareSectionSchema,
			income: shareSectionSchema,
			expense: shareSectionSchema,
		}),
		PROVINCE: z.object({
			value: shareSectionSchema,
			valueReceive: shareSectionSchema,
			income: shareSectionSchema,
			expense: shareSectionSchema,
		}),
	}).default(createEmptyTrafficManualShares()),
}) satisfies z.ZodType<TrafficPredictionServiceFields>;

export const validatedTrafficPredictionSchema = trafficPredictionSchema.superRefine((value, ctx) => {
	const quarterValues = [value.q1Percent, value.q2Percent, value.q3Percent, value.q4Percent];
	if (quarterValues.some(item => item == null)) {
		ctx.addIssue({
			code: "custom",
			path: ["q1Percent"],
			message: i18next.t("prediction.validation.quarters.allRequired"),
		});
		return;
	}

	const quarterTotal = quarterValues.reduce((total, item) => Number(total) + Number(item ?? 0), 0);
	if (quarterTotal !== 100) {
		ctx.addIssue({
			code: "custom",
			path: ["q1Percent"],
			message: i18next.t("prediction.validation.quarters.sumMustBeHundred"),
		});
	}

	if (value.companyType == null) {
		ctx.addIssue({
			code: "custom",
			path: ["companyType"],
			message: i18next.t("prediction.validation.traffic.companyTypeRequired"),
		});
	}

	if (value.locations.length < 1) {
		ctx.addIssue({
			code: "custom",
			path: ["locations"],
			message: i18next.t("prediction.validation.traffic.locationsRequired"),
		});
		return;
	}

	const activeLocations: TrafficLocationCode[] = [];

	value.locations.forEach((location, index) => {
		if (!location.location) {
			ctx.addIssue({
				code: "custom",
				path: ["locations", index, "location"],
				message: i18next.t("prediction.validation.traffic.locationRequired"),
			});
			return;
		}

		if (activeLocations.includes(location.location)) {
			ctx.addIssue({
				code: "custom",
				path: ["locations", index, "location"],
				message: i18next.t("prediction.validation.traffic.locationDuplicate"),
			});
			return;
		}

		activeLocations.push(location.location);

		if (location.valueYear == null) {
			ctx.addIssue({
				code: "custom",
				path: ["locations", index, "valueYear"],
				message: i18next.t("prediction.validation.traffic.valueRequired"),
			});
		}

		if (location.valueReceiveYear == null) {
			ctx.addIssue({
				code: "custom",
				path: ["locations", index, "valueReceiveYear"],
				message: i18next.t("prediction.validation.traffic.valueReceiveRequired"),
			});
		}

		if (location.incomeYear == null) {
			ctx.addIssue({
				code: "custom",
				path: ["locations", index, "incomeYear"],
				message: i18next.t("prediction.validation.traffic.incomeRequired"),
			});
		}

		if (location.expenseYear == null) {
			ctx.addIssue({
				code: "custom",
				path: ["locations", index, "expenseYear"],
				message: i18next.t("prediction.validation.traffic.expenseRequired"),
			});
		}
	});

	activeLocations
		.filter(location => isTrafficLocationCode(location))
		.forEach((location) => {
			TRAFFIC_METRICS.forEach((metric) => {
				const state = value.manualShares[location][metric.key];
				if (state.mode !== "manual")
					return;

				if (state.selectedCompanyIds.length < 1) {
					ctx.addIssue({
						code: "custom",
						path: ["manualShares", location, metric.key],
						message: i18next.t("prediction.validation.manualShares.companyRequired"),
					});
					return;
				}

				if (getShareTotal(state) !== 100) {
					ctx.addIssue({
						code: "custom",
						path: ["manualShares", location, metric.key],
						message: i18next.t("prediction.validation.manualShares.sumMustBeHundred"),
					});
				}
			});
		});
});
