import { commercialServiceFieldsSchema } from "./commercial.schema";
import { CommercialFields } from "./CommercialFields";

export const commercialService = {
	code: "commercial",
	schema: commercialServiceFieldsSchema,
	Fields: CommercialFields,
} as const;
