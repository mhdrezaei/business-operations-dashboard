import type { PredictionFormValues } from "../../model/prediction.form.types";
import type { PredictionListParams, PredictionListRow } from "../../model/prediction.list.types";
import {
	createPspPrediction,
	fetchPspPredictionDetail,
	fetchPspPredictionYears,
	listPspPredictions,
	updatePspPrediction,
} from "../../../api/predictions.api";
import { pspPredictionYearsQuery } from "../../queries/prediction.queries";
import { createEmptyPspFields } from "./psp.config";
import { PspPredictionFields } from "./psp.fields";
import { dtoToPspPredictionForm, findPspPredictionByFiscalYear, pspPredictionFormToPayload, yearlyValueIncomePredictionToListRow } from "./psp.mappers";
import { validatedPspPredictionSchema } from "./psp.schema";

export const pspPredictionService = {
	code: "psp",
	schema: validatedPspPredictionSchema,
	Fields: PspPredictionFields,
	createEmptyServiceFields: (previous?: Record<string, unknown>) => createEmptyPspFields(previous) as unknown as Record<string, unknown>,
	toFormValues: (record: unknown) => dtoToPspPredictionForm(record as any),
	findRecordBySelection: (records: unknown[], selection: { fiscalYear: number | null | undefined, serviceFields: Record<string, unknown> }) =>
		findPspPredictionByFiscalYear(records as any[], selection.fiscalYear, selection.serviceFields),
	fetchYears: (serviceId: number, companyType?: string | null) => fetchPspPredictionYears(serviceId, companyType) as Promise<any>,
	fetchList: (params: PredictionListParams) => listPspPredictions(params) as Promise<any>,
	fetchDetail: (id: number) => fetchPspPredictionDetail(id) as Promise<any>,
	getYearsQueryKey: (serviceId: number | null | undefined, companyType?: string | null) =>
		pspPredictionYearsQuery(serviceId, companyType).queryKey,
	createRecord: (payload: Record<string, unknown>) => createPspPrediction(payload as any),
	updateRecord: (id: number, payload: Record<string, unknown>) => updatePspPrediction(id, payload as any),
	toListRow: (
		record: unknown,
		context: { serviceId: number, serviceCode: PredictionListRow["serviceCode"], serviceLabel: string },
	) => yearlyValueIncomePredictionToListRow(record as any, context),
	toPayload: (values: PredictionFormValues, context: { companies: any[] }) =>
		pspPredictionFormToPayload(values, context.companies) as unknown as Record<string, unknown>,
} as const;
