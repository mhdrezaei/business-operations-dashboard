import type { PredictionFormValues } from "../../shared/model/prediction.form.types";
import type { PredictionListRow } from "../../shared/model/prediction.list.types";
import type { PredictionSubmitIntent } from "../../shared/ui/form/PredictionForm";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { predictionServiceRegistry } from "../../shared/services/registry";
import { PredictionForm } from "../../shared/ui/form/PredictionForm";
import { getReturnedRecordId, submitPrediction } from "./prediction.submit";

function applySubmitIntent(
	intent: PredictionSubmitIntent,
	values: PredictionFormValues,
	form: any,
	savedRecordId: number | null,
	wasUpdate: boolean,
	t: (key: string) => string,
) {
	if (intent === "submit") {
		window.$message?.success(t(wasUpdate ? "prediction.messages.updateSuccess" : "prediction.messages.createSuccess"),
		);

		if (savedRecordId) {
			form.setValue("recordId", savedRecordId, {
				shouldDirty: false,
				shouldTouch: false,
				shouldValidate: false,
			});
		}

		form.reset({
			...values,
			recordId: savedRecordId,
		});

		return;
	}

	if (intent === "submit_and_create_another") {
		window.$message?.success(t(wasUpdate ? "prediction.messages.updateSuccess" : "prediction.messages.createAndAnotherSuccess"));
		form.reset({
			recordId: null,
			serviceId: values.serviceId,
			serviceCode: values.serviceCode,
			fiscalYear: values.fiscalYear,
			note: "",
			serviceFields: {
				companyType: values.serviceFields?.companyType ?? null,
			},
		});
		return;
	}

	window.$message?.success(t(wasUpdate ? "prediction.messages.updateSuccess" : "prediction.messages.createAndEditSuccess"));
	if (savedRecordId) {
		form.setValue("recordId", savedRecordId, {
			shouldDirty: false,
			shouldTouch: false,
			shouldValidate: false,
		});
	}
}

function buildSavedPredictionRow(
	values: PredictionFormValues,
	record: unknown,
	recordId: number,
): PredictionListRow | null {
	if (!values.serviceCode || !values.serviceId)
		return null;

	const module = predictionServiceRegistry[values.serviceCode];
	if (!module)
		return null;

	const row = module.toListRow(record, {
		serviceCode: values.serviceCode,
		serviceId: values.serviceId,
		serviceLabel: values.serviceCode,
	});

	return {
		...row,
		id: recordId,
		serviceId: values.serviceId,
		serviceCode: values.serviceCode,
		fiscalYear: values.fiscalYear,
		raw: record,
	};
}

function CreatePrediction() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [submitting, setSubmitting] = useState(false);

	return (
		<PredictionForm
			submitting={submitting}
			onSubmit={async (values, intent, form) => {
				setSubmitting(true);
				try {
					const wasUpdate = Boolean(values.recordId);
					const result = await submitPrediction(values);
					const savedRecordId = getReturnedRecordId(result);
					applySubmitIntent(intent, values, form, savedRecordId, wasUpdate, t);

					if (intent === "submit_and_edit" && savedRecordId) {
						const row = buildSavedPredictionRow(values, result, savedRecordId);
						if (row) {
							form.reset();
							navigate("/predictions/list", { state: { directEdit: row } });
						}
					}
				}
				finally {
					setSubmitting(false);
				}
			}}
		/>
	);
}

export default CreatePrediction;
