import type { SmsPredictionServiceFields } from "../../model/prediction.form.types";
import i18next from "i18next";
import { z } from "zod";
import { getShareTotal } from "../../model/manual-share-template";
import { addQuarterIssues, quarterPercentSchema, requiredNonNegativeNumber } from "../../model/prediction.validation";
import { createEmptySmsChannelMetricShares, createEmptySmsChannelShares, createEmptySmsManualShares, SMS_CHANNEL_OPTIONS, SMS_METRIC_KEYS } from "./sms.config";

const shareSectionSchema = z.object({
	mode: z.enum(["auto", "manual"]).default("auto"),
	selectedCompanyIds: z.array(z.number().int().positive()).default([]),
	shares: z.record(z.string(), z.number().nullable()).default({}),
}).default({
	mode: "auto",
	selectedCompanyIds: [],
	shares: {},
});

const channelMetricSchema = z.object(
	Object.fromEntries(
		SMS_CHANNEL_OPTIONS.map(channel => [channel.key, z.number().nullable()]),
	),
).default(createEmptySmsChannelMetricShares());

export const smsPredictionSchema = z.object({
	companyType: z.preprocess(
		value => value == null || value === "" ? null : String(value).trim().toUpperCase(),
		z.string().nullable(),
	),
	q1Percent: quarterPercentSchema,
	q2Percent: quarterPercentSchema,
	q3Percent: quarterPercentSchema,
	q4Percent: quarterPercentSchema,
	valueYear: requiredNonNegativeNumber(i18next.t("prediction.validation.sms.valueRequired")),
	incomeYear: requiredNonNegativeNumber(i18next.t("prediction.validation.sms.incomeRequired")).nullable(),
	expenseYear: requiredNonNegativeNumber(i18next.t("prediction.validation.sms.expenseRequired")).nullable(),
	priceBuy: requiredNonNegativeNumber(i18next.t("prediction.validation.sms.priceBuyRequired")),
	priceSell: requiredNonNegativeNumber(i18next.t("prediction.validation.sms.priceSellRequired")),
	manualShares: z.object({
		value: shareSectionSchema,
		income: shareSectionSchema,
		expense: shareSectionSchema,
	}).default(createEmptySmsManualShares()),
	channels: z.object({
		value: channelMetricSchema,
		income: channelMetricSchema,
		expense: channelMetricSchema,
	}).default(createEmptySmsChannelShares()),
}) satisfies z.ZodType<SmsPredictionServiceFields>;

export const validatedSmsPredictionSchema = smsPredictionSchema.superRefine((value, ctx) => {
	if (value.companyType == null) {
		ctx.addIssue({
			code: "custom",
			path: ["companyType"],
			message: i18next.t("prediction.validation.traffic.companyTypeRequired"),
		});
	}

	if (!addQuarterIssues([value.q1Percent, value.q2Percent, value.q3Percent, value.q4Percent], ctx))
		return;

	SMS_METRIC_KEYS.forEach((metric) => {
		const state = value.manualShares[metric];
		if (state.mode !== "manual")
			return;

		if (state.selectedCompanyIds.length < 1) {
			ctx.addIssue({
				code: "custom",
				path: ["manualShares", metric],
				message: i18next.t("prediction.validation.manualShares.companyRequired"),
			});
			return;
		}

		if (getShareTotal(state) !== 100) {
			ctx.addIssue({
				code: "custom",
				path: ["manualShares", metric],
				message: i18next.t("prediction.validation.manualShares.sumMustBeHundred"),
			});
		}

		const channelValues = Object.values(value.channels[metric]);
		if (channelValues.some(amount => amount == null)) {
			ctx.addIssue({
				code: "custom",
				path: ["channels", metric],
				message: i18next.t("prediction.validation.sms.channelsRequired"),
			});
			return;
		}

		if (channelValues.reduce<number>((total, amount) => total + Number(amount), 0) !== 100) {
			ctx.addIssue({
				code: "custom",
				path: ["channels", metric],
				message: i18next.t("prediction.validation.manualShares.sumMustBeHundred"),
			});
		}
	});
});
