import type { PredictionFormValues } from "../../model/prediction.form.types";
import type { PredictionListParams, PredictionListRow } from "../../model/prediction.list.types";
import {
	createSmsPrediction,
	fetchSmsPredictionDetail,
	fetchSmsPredictionYears,
	listSmsPredictions,
	updateSmsPrediction,
} from "../../../api/predictions.api";
import { smsPredictionYearsQuery } from "../../queries/prediction.queries";
import { createEmptySmsFields } from "./sms.config";
import { SmsPredictionFields } from "./sms.fields";
import { dtoToSmsPredictionForm, findSmsPredictionByFiscalYear, smsPredictionFormToPayload, smsPredictionToListRow } from "./sms.mappers";
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
	fetchList: (params: PredictionListParams) => listSmsPredictions(params) as Promise<any>,
	fetchDetail: (id: number) => fetchSmsPredictionDetail(id) as Promise<any>,
	getYearsQueryKey: (serviceId: number | null | undefined) =>
		smsPredictionYearsQuery(serviceId).queryKey,
	createRecord: (payload: Record<string, unknown>) => createSmsPrediction(payload as any),
	updateRecord: (id: number, payload: Record<string, unknown>) => updateSmsPrediction(id, payload as any),
	toListRow: (
		record: unknown,
		context: { serviceId: number, serviceCode: PredictionListRow["serviceCode"], serviceLabel: string },
	) => smsPredictionToListRow(record as any, context),
	toPayload: (values: PredictionFormValues, context: { companyIds: number[] }) =>
		smsPredictionFormToPayload(values, context.companyIds) as unknown as Record<string, unknown>,
} as const;
