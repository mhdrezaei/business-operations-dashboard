import type { ZodTypeAny } from "zod";
import type { ContractServiceCode } from "../../shared/model/contract.form.types";
import { openapiService } from "./openapi/openapi.registry";
import { shahkarService } from "./shahkar/shahkar.registry";
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
	openapi: openapiService,
	commercial: openapiService,
	shahkar: shahkarService,
	sms: smsService,
	traffic: trafficService,
	// ...
};
