import type { ZodTypeAny } from "zod";
import type { PerformanceServiceCode } from "../model/performance.form.types";
import { commercialPerformanceService } from "./commercial/commercial.registry";
import { openapiPerformanceService } from "./openapi/openapi.registry";
import { pspPerformanceService } from "./psp/psp.registry";
import { shahkarPerformanceService } from "./shahkar/shahkar.registry";
import { smsCommissionPerformanceService } from "./sms-commission/sms-commission.registry";
import { smsPerformanceService } from "./sms/sms.registry";
import { trafficPerformanceService } from "./traffic/traffic.registry";

export interface PerformanceServiceModule {
	code: PerformanceServiceCode
	schema: ZodTypeAny
	Fields: React.ComponentType
}

export const performanceServiceRegistry: Partial<Record<PerformanceServiceCode, PerformanceServiceModule>> = {
	"openapi": openapiPerformanceService,
	"commercial": commercialPerformanceService,
	"psp": pspPerformanceService,
	"shahkar": shahkarPerformanceService,
	"sms": smsPerformanceService,
	"sms-commission": smsCommissionPerformanceService,
	"sms_commission": smsCommissionPerformanceService,
	"traffic": trafficPerformanceService,
};
