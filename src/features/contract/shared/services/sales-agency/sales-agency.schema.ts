import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema.js";
import { z } from "zod";
import { zNullablePercent } from "../../../shared/model/zod-helpers";

export const salesAgencyContractFieldsSchema = z.object({
	incomePercentage: zNullablePercent("درصد درآمد باید بین 0 تا 100 باشد").optional(),
	expensePercentage: zNullablePercent("درصد هزینه باید بین 0 تا 100 باشد").optional(),
	costTitles: z.array(z.object({ title: z.string().optional() })).optional(),
	addenda: z.array(addendumSchema).default([]).optional(),
});
