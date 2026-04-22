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
	createEmptyServiceFields: () => createEmptyPspFields() as unknown as Record<string, unknown>,
	toFormValues: (record: unknown) => dtoToPspPredictionForm(record as any),
	findRecordBySelection: (records: unknown[], selection: { fiscalYear: number | null | undefined }) =>
		findPspPredictionByFiscalYear(records as any[], selection.fiscalYear),
	fetchYears: (serviceId: number) => fetchPspPredictionYears(serviceId) as Promise<any>,
	fetchList: (params: PredictionListParams) => listPspPredictions(params) as Promise<any>,
	fetchDetail: (id: number) => fetchPspPredictionDetail(id) as Promise<any>,
	getYearsQueryKey: (serviceId: number | null | undefined) =>
		pspPredictionYearsQuery(serviceId).queryKey,
	createRecord: (payload: Record<string, unknown>) => createPspPrediction(payload as any),
	updateRecord: (id: number, payload: Record<string, unknown>) => updatePspPrediction(id, payload as any),
	toListRow: (
		record: unknown,
		context: { serviceId: number, serviceCode: PredictionListRow["serviceCode"], serviceLabel: string },
	) => yearlyValueIncomePredictionToListRow(record as any, context),
	toPayload: (values: PredictionFormValues, context: { companyIds: number[] }) =>
		pspPredictionFormToPayload(values, context.companyIds) as unknown as Record<string, unknown>,
} as const;
