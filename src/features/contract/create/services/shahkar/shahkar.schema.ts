import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { z } from "zod";

const addendumSchema = z
	.object({
		startYear: z.number().int().min(1401).max(1410).nullable(),
		startMonth: z.number().int().min(1).max(12).nullable(),
		endYear: z.number().int().min(1401).max(1410).nullable(),
		endMonth: z.number().int().min(1).max(12).nullable(),

		contractPricing: contractTypeSchema,

		description: z.string().max(2000).optional(),
	})
	.superRefine((v, ctx) => {
		if (v.startYear == null)
			ctx.addIssue({ code: "custom", path: ["startYear"], message: "سال شروع الحاقیه الزامی است" });
		if (v.startMonth == null)
			ctx.addIssue({ code: "custom", path: ["startMonth"], message: "ماه شروع الحاقیه الزامی است" });
		if (v.endYear == null)
			ctx.addIssue({ code: "custom", path: ["endYear"], message: "سال پایان الحاقیه الزامی است" });
		if (v.endMonth == null)
			ctx.addIssue({ code: "custom", path: ["endMonth"], message: "ماه پایان الحاقیه الزامی است" });
	});

export const shahkarServiceFieldsSchema = z.object({
	contractPricing: contractTypeSchema,
	addenda: z.array(addendumSchema).default([]).optional(),
});
