import { SmsCommissionPerformanceFields } from "./sms-commission.fields";
import { smsCommissionPerformanceSchema } from "./sms-commission.schema";

export const smsCommissionPerformanceService = {
	code: "sms-commission",
	schema: smsCommissionPerformanceSchema,
	Fields: SmsCommissionPerformanceFields,
} as const;
