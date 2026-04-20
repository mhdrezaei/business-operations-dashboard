import type { PredictionFormValues } from "../../model/prediction.form.types";
import {
	createSmsPrediction,
	fetchSmsPredictionYears,
	updateSmsPrediction,
} from "../../../api/predictions.api";
import { smsPredictionYearsQuery } from "../../queries/prediction.queries";
import { createEmptySmsFields } from "./sms.config";
import { SmsPredictionFields } from "./sms.fields";
import { dtoToSmsPredictionForm, findSmsPredictionByFiscalYear, smsPredictionFormToPayload } from "./sms.mappers";
import { validatedSmsPredictionSchema } from "./sms.schema";

export const smsPredictionService = {
	code: "sms",
	schema: validatedSmsPredictionSchema,
	Fields: SmsPredictionFields,
	createEmptyServiceFields: () => createEmptySmsFields() as unknown as Record<string, unknown>,
	toFormValues: (record: unknown) => dtoToSmsPredictionForm(record as any),
	findRecordBySelection: (records: unknown[], selection: { fiscalYear: number | null | undefined }) =>
		findSmsPredictionByFiscalYear(records as any[], selection.fiscalYear),
	fetchYears: (serviceId: number) => fetchSmsPredictionYears(serviceId) as Promise<any>,
	getYearsQueryKey: (serviceId: number | null | undefined) =>
		smsPredictionYearsQuery(serviceId).queryKey,
	createRecord: (payload: Record<string, unknown>) => createSmsPrediction(payload as any),
	updateRecord: (id: number, payload: Record<string, unknown>) => updateSmsPrediction(id, payload as any),
	toPayload: (values: PredictionFormValues, context: { companyIds: number[] }) =>
		smsPredictionFormToPayload(values, context.companyIds) as unknown as Record<string, unknown>,
} as const;
