import { TelecomFrameFields } from "./telecom-frame.fields";
import { telecomFrameServiceFieldsSchema } from "./telecom-frame.schema";

export const telecomFrameService = {
	code: "telecom_frame",
	schema: telecomFrameServiceFieldsSchema,
	Fields: TelecomFrameFields,
} as const;
