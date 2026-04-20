import type { PredictionFormValues } from "../../model/prediction.form.types";
import i18next from "i18next";
import { createElement } from "react";
import {
	createShahkarPrediction,
	fetchShahkarPredictionYears,
	updateShahkarPrediction,
} from "../../../api/predictions.api";
import { shahkarPredictionYearsQuery } from "../../queries/prediction.queries";
import { createEmptyYearlyValueIncomeFields } from "../psp/psp.config";
import { YearlyValueIncomePredictionFields } from "../psp/psp.fields";
import {
	dtoToYearlyValueIncomePredictionForm,
	findYearlyValueIncomePredictionByFiscalYear,
	yearlyValueIncomePredictionFormToPayload,
} from "../psp/psp.mappers";
import { createValidatedYearlyValueIncomePredictionSchema } from "../psp/psp.schema";

const validatedShahkarPredictionSchema = createValidatedYearlyValueIncomePredictionSchema(
	i18next.t("prediction.validation.shahkar.valueRequired"),
	i18next.t("prediction.validation.shahkar.incomeRequired"),
);

function ShahkarPredictionFields() {
	return createElement(YearlyValueIncomePredictionFields, {
		operationTitleKey: "prediction.operations.shahkar",
	});
}

export const shahkarPredictionService = {
	code: "shahkar",
	schema: validatedShahkarPredictionSchema,
	Fields: ShahkarPredictionFields,
	createEmptyServiceFields: () => createEmptyYearlyValueIncomeFields() as unknown as Record<string, unknown>,
	toFormValues: (record: unknown) => dtoToYearlyValueIncomePredictionForm(record as any),
	findRecordBySelection: (records: unknown[], selection: { fiscalYear: number | null | undefined }) =>
		findYearlyValueIncomePredictionByFiscalYear(records as any[], selection.fiscalYear),
	fetchYears: (serviceId: number) => fetchShahkarPredictionYears(serviceId) as Promise<any>,
	getYearsQueryKey: (serviceId: number | null | undefined) =>
		shahkarPredictionYearsQuery(serviceId).queryKey,
	createRecord: (payload: Record<string, unknown>) => createShahkarPrediction(payload as any),
	updateRecord: (id: number, payload: Record<string, unknown>) => updateShahkarPrediction(id, payload as any),
	toPayload: (values: PredictionFormValues, context: { companyIds: number[] }) =>
		yearlyValueIncomePredictionFormToPayload(values, context.companyIds) as unknown as Record<string, unknown>,
} as const;
