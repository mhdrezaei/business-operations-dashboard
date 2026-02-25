import { SmsCommissionFields } from "./sms-commission.fields";
import { smsCommissionServiceFieldsSchema } from "./sms-commission.schema";

export const smsCommissionService = {
	code: "sms-commission",
	schema: smsCommissionServiceFieldsSchema,
	Fields: SmsCommissionFields,
} as const;
