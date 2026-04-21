import type { PredictionFormValues } from "../../model/prediction.form.types";
import type { PredictionListParams, PredictionListRow } from "../../model/prediction.list.types";
import {
	createOpenApiPrediction,
	fetchOpenApiPredictionDetail,
	fetchOpenApiPredictionYears,
	listOpenApiPredictions,
	updateOpenApiPrediction,
} from "../../../api/predictions.api";
import { openApiPredictionYearsQuery } from "../../queries/prediction.queries";
import { createEmptyOpenApiFields } from "./openapi.config";
import { OpenApiPredictionFields } from "./openapi.fields";
import { dtoToOpenApiPredictionForm, findOpenApiPredictionByFiscalYear, openApiPredictionFormToPayload, openApiPredictionToListRow } from "./openapi.mappers";

import { validatedOpenApiPredictionSchema } from "./openapi.schema";

export const openapiPredictionService = {
	code: "openapi",
	schema: validatedOpenApiPredictionSchema,
	Fields: OpenApiPredictionFields,
	createEmptyServiceFields: () => createEmptyOpenApiFields() as unknown as Record<string, unknown>,
	toFormValues: (record: unknown) => dtoToOpenApiPredictionForm(record as any),
	findRecordBySelection: (records: unknown[], selection: { fiscalYear: number | null | undefined }) =>
		findOpenApiPredictionByFiscalYear(records as any[], selection.fiscalYear),
	fetchYears: (serviceId: number) => fetchOpenApiPredictionYears(serviceId) as Promise<any>,
	fetchList: (params: PredictionListParams) => listOpenApiPredictions(params) as Promise<any>,
	fetchDetail: (id: number) => fetchOpenApiPredictionDetail(id) as Promise<any>,
	getYearsQueryKey: (serviceId: number | null | undefined) =>
		openApiPredictionYearsQuery(serviceId).queryKey,
	createRecord: (payload: Record<string, unknown>) => createOpenApiPrediction(payload as any),
	updateRecord: (id: number, payload: Record<string, unknown>) => updateOpenApiPrediction(id, payload as any),
	toListRow: (
		record: unknown,
		context: { serviceId: number, serviceCode: PredictionListRow["serviceCode"], serviceLabel: string },
	) => openApiPredictionToListRow(record as any, context),
	toPayload: (values: PredictionFormValues, context: { companyIds: number[] }) =>
		openApiPredictionFormToPayload(values, context.companyIds) as unknown as Record<string, unknown>,
} as const;
