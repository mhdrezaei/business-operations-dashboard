import type { PredictionServiceCode } from "./prediction.form.types";
import { zodResolver } from "@hookform/resolvers/zod";
import i18next from "i18next";
import { z } from "zod";
import { predictionServiceRegistry } from "../services/registry";

const baseSchema = z.object({
	recordId: z.number().int().positive().nullable(),
	serviceId: z.number().int().positive().nullable(),
	serviceCode: z.preprocess(v => (v == null ? null : String(v)), z.string().nullable()),
	fiscalYear: z.number().int().min(1390).max(1450).nullable(),
	note: z.string(),
});

function requireNotNull(
	value: unknown,
	path: (string | number)[],
	message: string,
	ctx: z.RefinementCtx,
) {
	if (value != null)
		return;

	ctx.addIssue({
		code: "custom",
		path,
		message,
	});
}

export function buildPredictionSchema(serviceCode: PredictionServiceCode | null) {
	const module = serviceCode ? predictionServiceRegistry[serviceCode] : undefined;
	const moduleSchema = module?.schema ?? z.record(z.string(), z.unknown());

	return baseSchema
		.and(
			z.object({
				serviceFields: z.preprocess(v => (v == null ? {} : v), moduleSchema),
			}),
		)
		.superRefine((value, ctx) => {
			requireNotNull(value.serviceId, ["serviceId"], i18next.t("prediction.validation.base.serviceRequired"), ctx);
			requireNotNull(value.serviceCode, ["serviceCode"], i18next.t("prediction.validation.base.serviceCodeRequired"), ctx);
			requireNotNull(value.fiscalYear, ["fiscalYear"], i18next.t("prediction.validation.base.fiscalYearRequired"), ctx);
		});
}

export const predictionResolver = zodResolver;
