import { i18n } from "#src/locales";
import { z } from "zod";
import { contractTypeSchema } from "../contract-type/contract-type.schema";
import { toAddendumRange, validateAddendaPeriods } from "./addenda.periods";

function getAtPath(obj: any, path: (string | number)[]) {
	return path.reduce((acc, key) => (acc == null ? acc : acc[key as any]), obj);
}

const optionalPercentSchema = z.preprocess(
	(value) => {
		if (value === "" || value == null)
			return null;
		const numberValue = Number(value);
		return Number.isFinite(numberValue) ? numberValue : value;
	},
	z.number().min(0).max(100).nullable(),
).optional();

export const addendumSchema: z.ZodType<any> = z.lazy(() => z
	.object({
		id: z.number().int().positive().optional(),
		startYear: z.number().int().min(1401).max(1410).nullable(),
		startMonth: z.number().int().min(1).max(12).nullable(),
		endYear: z.number().int().min(1401).max(1410).nullable(),
		endMonth: z.number().int().min(1).max(12).nullable(),

		contractPricing: contractTypeSchema.optional(),
		hasNewCustomerRate: z.boolean().optional(),
		newCustomerPricing: contractTypeSchema.optional(),
		legacyPricing: z.object({
			paymentRegistration: contractTypeSchema,
			billInquiry: contractTypeSchema,
		}).optional(),
		tehranPricing: contractTypeSchema.optional(),
		provincePricing: contractTypeSchema.optional(),
		tehranUnit: z.enum(["GB/month", "Mbps"]).nullable().optional(),
		provinceUnit: z.enum(["GB/month", "Mbps"]).nullable().optional(),
		tehranRevenuePercent: optionalPercentSchema,
		provinceRevenuePercent: optionalPercentSchema,
		tehranBasedTire: z.boolean().optional(),
		provinceBasedTire: z.boolean().optional(),
		tehranContractModel: z.enum(["LEGACY", "VARIABLE_TABLE"]).optional(),
		provinceContractModel: z.enum(["LEGACY", "VARIABLE_TABLE"]).optional(),
		contractNumber: z.string().optional(),
		description: z.string().max(2000).optional(),
		children: z.array(addendumSchema).default([]).optional(),
	})
	.passthrough()
	.superRefine((v, ctx) => {
		if (v.hasNewCustomerRate === true && v.newCustomerPricing == null) {
			ctx.addIssue({
				code: "custom",
				path: ["newCustomerPricing"],
				message: i18n.t("contract.addenda.validation.newCustomerRate"),
			});
		}
		if (v.startYear == null)
			ctx.addIssue({ code: "custom", path: ["startYear"], message: i18n.t("contract.addenda.validation.startYear") });
		if (v.startMonth == null)
			ctx.addIssue({ code: "custom", path: ["startMonth"], message: i18n.t("contract.addenda.validation.startMonth") });
		if (v.endYear == null)
			ctx.addIssue({ code: "custom", path: ["endYear"], message: i18n.t("contract.addenda.validation.endYear") });
		if (v.endMonth == null)
			ctx.addIssue({ code: "custom", path: ["endMonth"], message: i18n.t("contract.addenda.validation.endMonth") });
	}));

export function addendaRefineValidAndNoOverlap(opts: {
	addendaPath: (string | number)[]
}) {
	return (val: any, ctx: z.RefinementCtx) => {
		const addenda: any[] = (getAtPath(val, opts.addendaPath) ?? []) as any[];
		validateAddendaPeriods(addenda, toAddendumRange(val), opts.addendaPath).forEach((issue) => {
			ctx.addIssue({
				code: "custom",
				path: issue.path,
				message: i18n.t(`contract.addenda.period.${issue.code}`),
			});
		});
	};
}
