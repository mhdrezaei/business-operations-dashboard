import { SmsPerformanceFields } from "./sms.fields";
import { smsPerformanceSchema } from "./sms.schema";

export const smsPerformanceService = {
	code: "sms",
	schema: smsPerformanceSchema,
	Fields: SmsPerformanceFields,
} as const;
