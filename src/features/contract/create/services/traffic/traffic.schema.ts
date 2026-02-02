import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema.js";
import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { z } from "zod";

export const trafficServiceFieldsSchema = z.object({
	tehranPricing: contractTypeSchema.optional(),
	provincePricing: contractTypeSchema.optional(),
	addenda: z.array(addendumSchema).default([]).optional(),
});
