import type { PerformanceFormValues } from "../../shared/model/performance.form.types";
import type { PerformanceSubmitIntent } from "../../shared/ui/form/PerformanceForm";
import { useState } from "react";
import { PerformanceForm } from "../../shared/ui/form/PerformanceForm";
import { submitPerformance } from "./performance.submit";

function applySubmitIntent(
	intent: PerformanceSubmitIntent,
	values: PerformanceFormValues,
	form: any,
) {
	if (intent === "submit") {
		window.$message?.success("عملکرد با موفقیت ثبت شد");
		return;
	}

	if (intent === "submit_and_create_another") {
		window.$message?.success("عملکرد ثبت شد. فرم برای ثبت مورد بعدی آماده است");
		form.reset({
			...values,
			month: null,
			contractId: null,
			contractModel: null,
			serviceFields: {},
		});
		return;
	}

	window.$message?.success("عملکرد ثبت شد. می‌توانید ادامه ویرایش را انجام دهید");
}

function CreatePerformance() {
	const [submitting, setSubmitting] = useState(false);

	return (
		<PerformanceForm
			submitting={submitting}
			onSubmit={async (values, intent, form) => {
				setSubmitting(true);
				try {
					await submitPerformance(values);
					applySubmitIntent(intent, values, form);
				}
				finally {
					setSubmitting(false);
				}
			}}
		/>
	);
}

export default CreatePerformance;
