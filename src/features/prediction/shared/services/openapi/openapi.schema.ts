import type { OpenApiAmountField, OpenApiPredictionServiceFields } from "../../model/prediction.form.types";
import i18next from "i18next";
import { z } from "zod";
import { getShareTotal } from "../../model/manual-share-template";
import { addQuarterIssues, quarterPercentSchema, requiredNonNegativeNumber } from "../../model/prediction.validation";
import {
	createEmptyOpenApiManualShares,
	getOpenApiAmountField,
	getOpenApiOperationSections,
	OPENAPI_METRICS,
	OPENAPI_OPERATION_SECTIONS,
} from "./openapi.config";

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

const amountShape = Object.fromEntries(
	OPENAPI_OPERATION_SECTIONS.flatMap(section =>
		OPENAPI_METRICS.map(metric => [
			getOpenApiAmountField(section.key, metric.key),
			requiredNonNegativeNumber(i18next.t("prediction.validation.openapi.nonNegativeNumber")).nullable(),
		] as const),
	),
) as unknown as Record<OpenApiAmountField, z.ZodType<number | null>>;

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
	openapiModel: z.enum(["LEGACY", "LEGACY_2", "PACKAGE"]).default("LEGACY"),
	packageExtras: z.record(z.string(), z.unknown()).optional(),
	q1Percent: quarterPercentSchema,
	q2Percent: quarterPercentSchema,
	q3Percent: quarterPercentSchema,
	q4Percent: quarterPercentSchema,
	...amountShape,
	manualShares: z.object(
		Object.fromEntries(OPENAPI_OPERATION_SECTIONS.map(section => [section.key, metricShareSchema])),
	).default(createEmptyOpenApiManualShares()),
}) as unknown as z.ZodType<OpenApiPredictionServiceFields>;

export const validatedOpenApiPredictionSchema = openApiPredictionSchema.superRefine((value, ctx) => {
	if (!addQuarterIssues([value.q1Percent, value.q2Percent, value.q3Percent, value.q4Percent], ctx))
		return;

	getOpenApiOperationSections(value.openapiModel).forEach((section) => {
		OPENAPI_METRICS.forEach((metric) => {
			const amountField = getOpenApiAmountField(section.key, metric.key);
			if (value[amountField] == null) {
				ctx.addIssue({
					code: "custom",
					path: [amountField],
					message: i18next.t("prediction.validation.openapi.amountRequired"),
				});
			}

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
