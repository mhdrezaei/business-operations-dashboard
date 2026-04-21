import type { CompanyDto } from "#src/api/common/common.types";
import type { Paginated } from "#src/api/types";
import type { ZodTypeAny } from "zod";
import type { PredictionFormValues, PredictionServiceCode } from "../model/prediction.form.types";
import type { PredictionListParams, PredictionListRow } from "../model/prediction.list.types";
import { openapiPredictionService } from "./openapi/openapi.registry";
import { pspPredictionService } from "./psp/psp.registry";
import { shahkarPredictionService } from "./shahkar/shahkar.registry";
import { smsPredictionService } from "./sms/sms.registry";
import { trafficPredictionService } from "./traffic/traffic.registry";

export interface PredictionRecordSelection {
	fiscalYear: number | null | undefined
	serviceFields: PredictionFormValues["serviceFields"]
}

export interface PredictionPayloadContext {
	companyIds: number[]
	companies: CompanyDto[]
}

export interface PredictionListRowContext {
	serviceCode: PredictionServiceCode
	serviceId: number
	serviceLabel: string
}

export interface PredictionServiceModule {
	code: PredictionServiceCode
	schema: ZodTypeAny
	Fields: React.ComponentType
	createEmptyServiceFields: (
		previous?: PredictionFormValues["serviceFields"],
	) => PredictionFormValues["serviceFields"]
	toFormValues: (record: unknown) => Partial<PredictionFormValues>
	findRecordBySelection: (records: unknown[], selection: PredictionRecordSelection) => unknown | null
	fetchYears: (serviceId: number) => Promise<Paginated<unknown>>
	fetchList: (params: PredictionListParams) => Promise<Paginated<unknown>>
	fetchDetail: (id: number) => Promise<unknown>
	getYearsQueryKey: (serviceId: number | null | undefined) => readonly unknown[]
	createRecord: (payload: Record<string, unknown>) => Promise<unknown>
	updateRecord: (id: number, payload: Record<string, unknown>) => Promise<unknown>
	toListRow: (record: unknown, context: PredictionListRowContext) => PredictionListRow
	toPayload: (
		values: PredictionFormValues,
		context: PredictionPayloadContext,
	) => Record<string, unknown>
}

export const predictionServiceRegistry: Partial<Record<PredictionServiceCode, PredictionServiceModule>> = {
	openapi: openapiPredictionService,
	psp: pspPredictionService,
	shahkar: shahkarPredictionService,
	sms: smsPredictionService,
	traffic: trafficPredictionService,
};
