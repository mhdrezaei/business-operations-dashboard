import type { PredictionFormValues } from "../../shared/model/prediction.form.types";
import type { PredictionSubmitIntent } from "../../shared/ui/form/PredictionForm";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
		window.$message?.success(t(wasUpdate ? "prediction.messages.updateSuccess" : "prediction.messages.createSuccess"));
		form.reset();
		return;
	}

	if (intent === "submit_and_create_another") {
		window.$message?.success(t(wasUpdate ? "prediction.messages.updateSuccess" : "prediction.messages.createAndAnotherSuccess"));
		form.reset({
			recordId: null,
			serviceId: values.serviceId,
			serviceCode: values.serviceCode,
			fiscalYear: null,
			note: "",
			serviceFields: {},
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

function CreatePrediction() {
	const { t } = useTranslation();
	const [submitting, setSubmitting] = useState(false);

	return (
		<PredictionForm
			submitting={submitting}
			onSubmit={async (values, intent, form) => {
				setSubmitting(true);
				try {
					const wasUpdate = Boolean(values.recordId);
					const result = await submitPrediction(values);
					applySubmitIntent(intent, values, form, getReturnedRecordId(result), wasUpdate, t);
				}
				finally {
					setSubmitting(false);
				}
			}}
		/>
	);
}

export default CreatePrediction;
