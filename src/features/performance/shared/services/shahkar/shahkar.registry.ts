import { ShahkarPerformanceFields } from "./shahkar.fields";
import { shahkarPerformanceSchema } from "./shahkar.schema";

export const shahkarPerformanceService = {
	code: "shahkar",
	schema: shahkarPerformanceSchema,
	Fields: ShahkarPerformanceFields,
} as const;
