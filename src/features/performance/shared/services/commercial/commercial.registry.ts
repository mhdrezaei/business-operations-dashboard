import { z } from "zod";
import { CommercialPerformanceFields } from "./commercial.fields";

export const commercialPerformanceService = {
	code: "commercial",
	schema: z.record(z.string(), z.unknown()),
	Fields: CommercialPerformanceFields,
} as const;
