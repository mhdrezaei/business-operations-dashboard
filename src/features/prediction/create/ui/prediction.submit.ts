import type { PredictionFormValues } from "../../shared/model/prediction.form.types";
import { fetchCompaniesByService } from "#src/api/common/common.api";
import i18next from "i18next";
import { predictionServiceRegistry } from "../../shared/services/registry";

export async function submitPrediction(values: PredictionFormValues) {
	if (!values.serviceId || !values.serviceCode || !values.fiscalYear) {
		throw new Error(i18next.t("prediction.errors.baseFormIncomplete"));
	}

	const module = predictionServiceRegistry[values.serviceCode];
	if (!module) {
		throw new Error(i18next.t("prediction.errors.unsupportedService"));
	}

	const companies = await fetchCompaniesByService(values.serviceId);
	const companyList = companies.results ?? [];
	const payload = module.toPayload(values, {
		companyIds: companyList.map(company => company.id),
		companies: companyList,
	});

	if (values.recordId) {
		return module.updateRecord(values.recordId, payload as any);
	}

	return module.createRecord(payload as any);
}

export function getReturnedRecordId(record: unknown) {
	const recordId = Number((record as { id?: unknown } | null | undefined)?.id);
	return Number.isInteger(recordId) && recordId > 0 ? recordId : null;
}
