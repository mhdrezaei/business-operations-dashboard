import type { PredictionFormValues } from "../../model/prediction.form.types";
import {
	createPspPrediction,
	fetchPspPredictionYears,
	updatePspPrediction,
} from "../../../api/predictions.api";
import { pspPredictionYearsQuery } from "../../queries/prediction.queries";
import { createEmptyPspFields } from "./psp.config";
import { PspPredictionFields } from "./psp.fields";
import { dtoToPspPredictionForm, findPspPredictionByFiscalYear, pspPredictionFormToPayload } from "./psp.mappers";
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
	getYearsQueryKey: (serviceId: number | null | undefined) =>
		pspPredictionYearsQuery(serviceId).queryKey,
	createRecord: (payload: Record<string, unknown>) => createPspPrediction(payload as any),
	updateRecord: (id: number, payload: Record<string, unknown>) => updatePspPrediction(id, payload as any),
	toPayload: (values: PredictionFormValues, context: { companyIds: number[] }) =>
		pspPredictionFormToPayload(values, context.companyIds) as unknown as Record<string, unknown>,
} as const;
