import type { CompanyDto } from "#src/api/common/common.types";
import type { PredictionFormValues } from "../../model/prediction.form.types";
import {
	createTrafficPrediction,
	fetchTrafficPredictionYears,
	updateTrafficPrediction,
} from "../../../api/predictions.api";
import { trafficPredictionYearsQuery } from "../../queries/prediction.queries";
import { createEmptyTrafficFields } from "./traffic.config";
import { TrafficPredictionFields } from "./traffic.fields";
import { dtoToTrafficPredictionForm, findTrafficPredictionBySelection, trafficPredictionFormToPayload } from "./traffic.mappers";
import { validatedTrafficPredictionSchema } from "./traffic.schema";

export const trafficPredictionService = {
	code: "traffic",
	schema: validatedTrafficPredictionSchema,
	Fields: TrafficPredictionFields,
	createEmptyServiceFields: (previous?: Record<string, unknown>) =>
		createEmptyTrafficFields(previous) as unknown as Record<string, unknown>,
	toFormValues: (record: unknown) => dtoToTrafficPredictionForm(record as any),
	findRecordBySelection: (
		records: unknown[],
		selection: { fiscalYear: number | null | undefined, serviceFields: PredictionFormValues["serviceFields"] },
	) =>
		findTrafficPredictionBySelection(records as any[], selection.fiscalYear, selection.serviceFields as Record<string, unknown>),
	fetchYears: (serviceId: number) => fetchTrafficPredictionYears(serviceId) as Promise<any>,
	getYearsQueryKey: (serviceId: number | null | undefined) =>
		trafficPredictionYearsQuery(serviceId).queryKey,
	createRecord: (payload: Record<string, unknown>) => createTrafficPrediction(payload as any),
	updateRecord: (id: number, payload: Record<string, unknown>) => updateTrafficPrediction(id, payload as any),
	toPayload: (values: PredictionFormValues, context: { companies: CompanyDto[] }) =>
		trafficPredictionFormToPayload(values, context.companies) as unknown as Record<string, unknown>,
} as const;
