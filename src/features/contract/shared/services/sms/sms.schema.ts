import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema.js";
import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { z } from "zod";

const isOfficialSchema = z.preprocess(
	v => (v === "" || v == null ? true : v),
	z.boolean(),
).default(true);

export const smsServiceFieldsSchema = z.object({
	isOfficial: isOfficialSchema,
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
		minProfit: z.number().nullable(),
	}).optional(),

	governmentRate: contractTypeSchema.optional(),
	addenda: z.array(addendumSchema).default([]).optional(),

}).passthrough();
