import type { OpenApiPredictionServiceFields, PredictionShareSectionValue } from "../../model/prediction.form.types";
import i18next from "i18next";
import { z } from "zod";
import {
	createEmptyOpenApiChannelShares,
	createEmptyOpenApiManualShares,
	getOpenApiOperationSections,
	OPENAPI_CHANNEL_OPTIONS,
	OPENAPI_METRICS,
} from "./openapi.config";

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
	mode: z.enum(["auto", "manual"]).default("auto"),
	selectedCompanyIds: z.array(z.number().int().positive()).default([]),
	shares: z.record(z.string(), z.number().nullable()).default({}),
}).default({
	mode: "auto",
	selectedCompanyIds: [],
	shares: {},
});

const metricShareSchema = z.object({
	value: shareSectionSchema,
	income: shareSectionSchema,
	expense: shareSectionSchema,
});

const channelSharesSchema = z.object({
	value: z.object(
		Object.fromEntries(
			OPENAPI_CHANNEL_OPTIONS.map(channel => [channel.key, z.number().nullable()]),
		),
	),
});

function getShareTotal(section: PredictionShareSectionValue) {
	return section.selectedCompanyIds.reduce((total, companyId) => {
		const amount = section.shares[String(companyId)] ?? 0;
		return Number(total) + Number(amount ?? 0);
	}, 0);
}

function addManualShareIssue(
	ctx: z.RefinementCtx,
	operationKey: string,
	metricKey: string,
	message: string,
) {
	ctx.addIssue({
		code: "custom",
		path: ["manualShares", operationKey, metricKey],
		message,
	});
}

export const openApiPredictionSchema = z.object({
	openapiModel: z.enum(["LEGACY", "PACKAGE"]).default("LEGACY"),
	q1Percent: quarterPercentSchema,
	q2Percent: quarterPercentSchema,
	q3Percent: quarterPercentSchema,
	q4Percent: quarterPercentSchema,
	billInquiryValueYear: nullableNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")),
	billInquiryIncomeYear: nullableNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")),
	billInquiryExpenseYear: nullableNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")),
	receiptRegisterValueYear: nullableNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")),
	receiptRegisterIncomeYear: nullableNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")),
	receiptRegisterExpenseYear: nullableNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")),
	smsTotalValueYear: nullableNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")),
	smsTotalIncomeYear: nullableNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")),
	smsTotalExpenseYear: nullableNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")),
	trafficTotalValueYear: nullableNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")),
	trafficTotalIncomeYear: nullableNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")),
	trafficTotalExpenseYear: nullableNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")),
	manualShares: z.object({
		billInquiry: metricShareSchema,
		receiptRegister: metricShareSchema,
		smsTotal: metricShareSchema,
		trafficTotal: metricShareSchema,
	}).default(createEmptyOpenApiManualShares()),
	channels: channelSharesSchema.default(createEmptyOpenApiChannelShares()),
}) satisfies z.ZodType<OpenApiPredictionServiceFields>;

export const validatedOpenApiPredictionSchema = openApiPredictionSchema.superRefine((value, ctx) => {
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

	getOpenApiOperationSections(value.openapiModel).forEach((section) => {
		OPENAPI_METRICS.forEach((metric) => {
			const shareState = value.manualShares[section.key][metric.key];
			if (shareState.mode !== "manual")
				return;

			if (shareState.selectedCompanyIds.length < 1) {
				addManualShareIssue(
					ctx,
					section.key,
					metric.key,
					i18next.t("prediction.validation.manualShares.companyRequired"),
				);
				return;
			}

			const total = getShareTotal(shareState);
			if (total !== 100) {
				addManualShareIssue(
					ctx,
					section.key,
					metric.key,
					i18next.t("prediction.validation.manualShares.sumMustBeHundred"),
				);
			}
		});
	});

	if (value.openapiModel === "PACKAGE") {
		const channelTotal = OPENAPI_CHANNEL_OPTIONS.reduce((total, channel) => {
			return total + Number(value.channels.value[channel.key] ?? 0);
		}, 0);

		if (channelTotal !== 100) {
			ctx.addIssue({
				code: "custom",
				path: ["channels", "value"],
				message: i18next.t("prediction.validation.manualShares.sumMustBeHundred"),
			});
		}
	}
});
