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

	const operation = values.recordId ? "update" : "create";

	try {
		if (values.recordId) {
			return await module.updateRecord(values.recordId, payload as any);
		}

		return await module.createRecord(payload as any);
	}
	catch (error: any) {
		let responseBody: unknown = null;

		if (error?.response) {
			try {
				responseBody = await error.response.clone().json();
			}
			catch {
				try {
					responseBody = await error.response.clone().text();
				}
				catch {
					responseBody = null;
				}
			}
		}

		console.error("[prediction.submit] error", {
			operation,
			serviceCode: values.serviceCode,
			serviceId: values.serviceId,
			recordId: values.recordId ?? null,
			payload,
			status: error?.response?.status ?? null,
			responseBody,
			error,
		});

		throw error;
	}
}

export function getReturnedRecordId(record: unknown) {
	const recordId = Number((record as { id?: unknown } | null | undefined)?.id);
	return Number.isInteger(recordId) && recordId > 0 ? recordId : null;
}
