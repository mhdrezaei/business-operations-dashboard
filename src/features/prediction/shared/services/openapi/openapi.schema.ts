import type { OpenApiPredictionServiceFields, PredictionShareSectionValue } from "../../model/prediction.form.types";
import i18next from "i18next";
import { z } from "zod";
import { createEmptyOpenApiManualShares, OPENAPI_METRICS, OPENAPI_OPERATION_SECTIONS } from "./openapi.config";

function nullableNonNegativeNumber(message: string) {
	return z.number({ message }).nullable().refine(value => value == null || value >= 0, { message });
}

const quarterPercentSchema = z.number().int().min(0).max(100).nullable();

const shareSectionSchema = z.object({
	mode: z.enum(["auto", "manual"]),
	selectedCompanyIds: z.array(z.number().int().positive()),
	shares: z.record(z.string(), z.number().nullable()),
});

const metricShareSchema = z.object({
	value: shareSectionSchema,
	income: shareSectionSchema,
	expense: shareSectionSchema,
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
	openapiModel: z.literal("LEGACY"),
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

	OPENAPI_OPERATION_SECTIONS.forEach((section) => {
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
});
