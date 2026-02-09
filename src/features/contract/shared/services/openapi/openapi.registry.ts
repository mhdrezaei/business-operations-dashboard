import { OpenApiFields } from "./openapi.fields";
import { openApiServiceFieldsSchema } from "./openapi.schema";

export const openapiService = {
	code: "openapi",
	schema: openApiServiceFieldsSchema,
	Fields: OpenApiFields,
} as const;
