import { PspPerformanceFields } from "./psp.fields";
import { pspPerformanceSchema } from "./psp.schema";

export const pspPerformanceService = {
	code: "psp",
	schema: pspPerformanceSchema,
	Fields: PspPerformanceFields,
} as const;
