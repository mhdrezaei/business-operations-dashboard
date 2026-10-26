import type { PspPredictionServiceFields } from "../../model/prediction.form.types";
import i18next from "i18next";
import { z } from "zod";
import { getShareTotal } from "../../model/manual-share-template";
import { addQuarterIssues, quarterPercentSchema, requiredNonNegativeNumber } from "../../model/prediction.validation";
import { createEmptyPspManualShares } from "./psp.config";

const shareSectionSchema = z.object({
	mode: z.enum(["auto", "manual"]).default("auto"),
	selectedCompanyIds: z.array(z.number().int().positive()).default([]),
	shares: z.record(z.string(), z.number().nullable()).default({}),
}).default({
	mode: "auto",
	selectedCompanyIds: [],
	shares: {},
});

export const pspPredictionSchema = z.object({
	companyType: z.preprocess(
		value => value == null || value === "" ? null : String(value).trim().toUpperCase(),
		z.string().nullable(),
	).optional(),
	q1Percent: quarterPercentSchema,
	q2Percent: quarterPercentSchema,
	q3Percent: quarterPercentSchema,
	q4Percent: quarterPercentSchema,
	valueYear: requiredNonNegativeNumber(i18next.t("prediction.validation.psp.valueRequired")),
	incomeYear: requiredNonNegativeNumber(i18next.t("prediction.validation.psp.incomeRequired")),
	manualShares: z.object({
		value: shareSectionSchema,
		income: shareSectionSchema,
	}).default(createEmptyPspManualShares()),
}) satisfies z.ZodType<PspPredictionServiceFields>;

export function createValidatedYearlyValueIncomePredictionSchema(
	valueMessage: string,
	incomeMessage: string,
	options: { requireCompanyType?: boolean } = {},
) {
	return z.object({
		companyType: z.preprocess(
			value => value == null || value === "" ? null : String(value).trim().toUpperCase(),
			z.string().nullable(),
		).optional(),
		q1Percent: quarterPercentSchema,
		q2Percent: quarterPercentSchema,
		q3Percent: quarterPercentSchema,
		q4Percent: quarterPercentSchema,
		valueYear: requiredNonNegativeNumber(valueMessage),
		incomeYear: requiredNonNegativeNumber(incomeMessage),
		manualShares: z.object({
			value: shareSectionSchema,
			income: shareSectionSchema,
		}).default(createEmptyPspManualShares()),
	}).superRefine((value, ctx) => {
		if (options.requireCompanyType && value.companyType == null) {
			ctx.addIssue({
				code: "custom",
				path: ["companyType"],
				message: i18next.t("prediction.validation.traffic.companyTypeRequired"),
			});
		}

		if (!addQuarterIssues([value.q1Percent, value.q2Percent, value.q3Percent, value.q4Percent], ctx))
			return;

		(["value", "income"] as const).forEach((metric) => {
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
	});
}

export const validatedPspPredictionSchema = createValidatedYearlyValueIncomePredictionSchema(
	i18next.t("prediction.validation.psp.valueRequired"),
	i18next.t("prediction.validation.psp.incomeRequired"),
	{ requireCompanyType: true },
);
