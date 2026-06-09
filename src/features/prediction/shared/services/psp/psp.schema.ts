import type { PredictionShareSectionValue, PspPredictionServiceFields } from "../../model/prediction.form.types";
import i18next from "i18next";
import { z } from "zod";
import { createEmptyPspManualShares } from "./psp.config";

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

function getShareTotal(section: PredictionShareSectionValue) {
	return section.selectedCompanyIds.reduce((total, companyId) => {
		const amount = section.shares[String(companyId)] ?? 0;
		return Number(total) + Number(amount ?? 0);
	}, 0);
}

export const pspPredictionSchema = z.object({
	companyType: z.preprocess(
		value => value == null || value === "" ? null : String(value).trim().toUpperCase(),
		z.string().nullable(),
	).optional(),
	q1Percent: quarterPercentSchema,
	q2Percent: quarterPercentSchema,
	q3Percent: quarterPercentSchema,
	q4Percent: quarterPercentSchema,
	valueYear: nullableNonNegativeNumber(i18next.t("prediction.validation.psp.valueRequired")),
	incomeYear: nullableNonNegativeNumber(i18next.t("prediction.validation.psp.incomeRequired")),
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
		valueYear: nullableNonNegativeNumber(valueMessage),
		incomeYear: nullableNonNegativeNumber(incomeMessage),
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
