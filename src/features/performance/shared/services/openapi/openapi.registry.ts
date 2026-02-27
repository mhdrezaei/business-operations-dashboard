import { OpenApiPerformanceFields } from "./openapi.fields";
import { openapiPerformanceSchema } from "./openapi.schema";

export const openapiPerformanceService = {
	code: "openapi",
	schema: openapiPerformanceSchema,
	Fields: OpenApiPerformanceFields,
} as const;
