import { smsServiceFieldsSchema } from "./sms.schema";
import { SmsFields } from "./SmsFields";

export const smsService = {
	code: "sms",
	schema: smsServiceFieldsSchema,
	Fields: SmsFields,
} as const;
