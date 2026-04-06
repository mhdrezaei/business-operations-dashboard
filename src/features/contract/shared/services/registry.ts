import type { ZodTypeAny } from "zod";
import type { ContractServiceCode } from "../../shared/model/contract.form.types";
import { commercialService } from "./commercial/commercial.registry";
import { openapiService } from "./openapi/openapi.registry";
import { shahkarService } from "./shahkar/shahkar.registry";
import { smsCommissionService } from "./sms-commission/sms-commission.registry";
import { smsService } from "./sms/sms.registry";
import { trafficService } from "./traffic/traffic.registry";
// import { pspService } from "./psp/psp.registry" ...

export interface ServiceModule {
	code: ContractServiceCode
	schema: ZodTypeAny // schema مخصوص serviceFields
	Fields: React.ComponentType // کامپوننت فیلدهای سرویس
	toPayload?: (values: unknown) => unknown // mapper اختیاری
}

export const serviceRegistry: Partial<Record<ContractServiceCode, ServiceModule>> = {
	"openapi": openapiService,
	"commercial": commercialService,
	"shahkar": shahkarService,
	"sms": smsService,
	"sms-commission": smsCommissionService,
	"sms_commission": smsCommissionService,
	"traffic": trafficService,
	// ...
};
