import { shahkarServiceFieldsSchema } from "./shahkar.schema";
import { ShahkarFields } from "./shahkarFields";

export const shahkarService = {
	code: "shahkar",
	schema: shahkarServiceFieldsSchema,
	Fields: ShahkarFields,
} as const;
