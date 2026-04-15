import type { PerformanceFormValues } from "../../shared/model/performance.form.types";
import type { PerformanceSubmitIntent } from "../../shared/ui/form/PerformanceForm";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PerformanceForm } from "../../shared/ui/form/PerformanceForm";
import { submitPerformance } from "./performance.submit";

function applySubmitIntent(
	intent: PerformanceSubmitIntent,
	values: PerformanceFormValues,
	form: any,
	t: (key: string) => string,
) {
	if (intent === "submit") {
		window.$message?.success(t("performance.messages.createSuccess"));
		form.reset();
		return;
	}

	if (intent === "submit_and_create_another") {
		window.$message?.success(t("performance.messages.createAndAnotherSuccess"));
		form.reset({
			...values,
			month: null,
			contractId: null,
			contractModel: null,
			serviceFields: {},
		});
		return;
	}

	window.$message?.success(t("performance.messages.createAndEditSuccess"));
}

function CreatePerformance() {
	const { t } = useTranslation();
	const [submitting, setSubmitting] = useState(false);

	return (
		<PerformanceForm
			submitting={submitting}
			onSubmit={async (values, intent, form) => {
				setSubmitting(true);
				try {
					await submitPerformance(values);
					applySubmitIntent(intent, values, form, t);
				}
				finally {
					setSubmitting(false);
				}
			}}
		/>
	);
}

export default CreatePerformance;
