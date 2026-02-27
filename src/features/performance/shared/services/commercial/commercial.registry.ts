import { CommercialPerformanceFields } from "./commercial.fields";
import { commercialPerformanceSchema } from "./commercial.schema";

export const commercialPerformanceService = {
	code: "commercial",
	schema: commercialPerformanceSchema,
	Fields: CommercialPerformanceFields,
} as const;
