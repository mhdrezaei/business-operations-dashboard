import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema";
import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { z } from "zod";

export const shahkarServiceFieldsSchema = z.object({
	contractPricing: contractTypeSchema,
	addenda: z.array(addendumSchema).default([]).optional(),
});
