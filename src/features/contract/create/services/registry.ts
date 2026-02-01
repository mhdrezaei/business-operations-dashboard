import type { ZodTypeAny } from "zod";
import type { ContractServiceCode } from "../model/contract.form.types";
import { openapiService } from "./openapi/openapi.registry";
import { shahkarService } from "./shahkar/shahkar.registry";
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
	// psp: pspService,
	// ...
};
