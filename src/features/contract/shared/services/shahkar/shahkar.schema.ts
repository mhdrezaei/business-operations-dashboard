import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema";
import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { z } from "zod";

export const shahkarServiceFieldsSchema = z.object({
	contractPricing: contractTypeSchema,
	hasNewCustomerRate: z.boolean().default(false),
	newCustomerPricing: contractTypeSchema.optional(),
	addenda: z.array(addendumSchema).default([]).optional(),
}).superRefine((value, ctx) => {
	if (value.hasNewCustomerRate && value.newCustomerPricing == null) {
		ctx.addIssue({
			code: "custom",
			path: ["newCustomerPricing"],
			message: "نرخ مشتریان جدید الزامی است",
		});
	}
});
