import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema.js";
import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { z } from "zod";

// serviceFields.sms
export const smsServiceFieldsSchema = z.object({
	// ✅ حالت شرکای تجاری (طبق تصاویر)
	operatorRevenue: z.object({
		irancellFa: contractTypeSchema,
		irancellEn: contractTypeSchema,
		hamrahAvalFa: contractTypeSchema,
		otherFa: contractTypeSchema,
		otherEn: contractTypeSchema,
	}).optional(),

	governmentRevenue: contractTypeSchema.optional(),
	profit: z.object({
		pricing: contractTypeSchema,
		minProfit: z.number().nullable(), // اختیاری در UI گفتی "اختیاری"
	}).optional(),

	// ✅ حالت دولت/اپراتورها: جایگزین درآمد دولت/سود
	governmentRate: contractTypeSchema.optional(),
	addenda: z.array(addendumSchema).default([]).optional(),

}).passthrough();
