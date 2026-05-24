import type { PredictionShareSectionValue, SmsPredictionServiceFields } from "../../model/prediction.form.types";
import i18next from "i18next";
import { z } from "zod";
import { createEmptySmsChannelShares, createEmptySmsManualShares, SMS_CHANNEL_OPTIONS } from "./sms.config";

function nullableNonNegativeNumber(message: string) {
	return z.number({ message }).nullable().refine(value => value == null || value >= 0, { message });
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

function getShareTotal(section: PredictionShareSectionValue) {
	return section.selectedCompanyIds.reduce((total, companyId) => {
		const amount = section.shares[String(companyId)] ?? 0;
		return Number(total) + Number(amount ?? 0);
	}, 0);
}

export const smsPredictionSchema = z.object({
	companyType: z.preprocess(
		value => value == null || value === "" ? null : String(value).trim().toUpperCase(),
		z.string().nullable(),
	),
	q1Percent: quarterPercentSchema,
	q2Percent: quarterPercentSchema,
	q3Percent: quarterPercentSchema,
	q4Percent: quarterPercentSchema,
	valueYear: nullableNonNegativeNumber(i18next.t("prediction.validation.sms.valueRequired")),
	incomeYear: nullableNonNegativeNumber(i18next.t("prediction.validation.sms.incomeRequired")),
	expenseYear: nullableNonNegativeNumber(i18next.t("prediction.validation.sms.expenseRequired")),
	priceBuy: nullableNonNegativeNumber(i18next.t("prediction.validation.sms.priceBuyRequired")),
	priceSell: nullableNonNegativeNumber(i18next.t("prediction.validation.sms.priceSellRequired")),
	manualShares: z.object({
		value: shareSectionSchema,
		income: shareSectionSchema,
		expense: shareSectionSchema,
	}).default(createEmptySmsManualShares()),
	channels: z.object({
		value: z.object(
			Object.fromEntries(
				SMS_CHANNEL_OPTIONS.map(channel => [channel.key, z.number().nullable()]),
			),
		).default(createEmptySmsChannelShares().value),
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

	(["value", "income", "expense"] as const).forEach((metric) => {
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
	});

	const channelTotal = Object.values(value.channels.value).reduce(
		(total, amount) => Number(total) + Number(amount ?? 0),
		0,
	);

	if (channelTotal !== 100) {
		ctx.addIssue({
			code: "custom",
			path: ["channels"],
			message: i18next.t("prediction.validation.manualShares.sumMustBeHundred"),
		});
	}
});
