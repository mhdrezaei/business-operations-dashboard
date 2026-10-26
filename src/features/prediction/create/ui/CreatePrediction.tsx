import type { PredictionFormValues, PredictionSubmitMode } from "../../shared/model/prediction.form.types";
import type { PredictionListRow } from "../../shared/model/prediction.list.types";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { predictionServiceRegistry } from "../../shared/services/registry";
import { PredictionForm } from "../../shared/ui/form/PredictionForm";
import { submitPrediction } from "./prediction.submit";

const emptyPredictionValues: PredictionFormValues = {
	recordId: null,
	serviceId: null,
	serviceCode: null,
	fiscalYear: null,
	note: "",
	serviceFields: {},
};

const SUBMIT_SUCCESS_MESSAGE_KEYS: Record<PredictionSubmitMode, string> = {
	create_reset: "prediction.messages.createSuccess",
	create_another: "prediction.messages.createAndAnotherSuccess",
	create_and_edit: "prediction.messages.createAndEditSuccess",
};

function CreatePrediction() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const [submitting, setSubmitting] = useState(false);
	const editRow = (location.state as { editPrediction?: PredictionListRow } | null)?.editPrediction ?? null;
	const editModule = editRow ? predictionServiceRegistry[editRow.serviceCode] : undefined;
	const initialValues = useMemo(() => {
		if (!editRow || !editModule)
			return null;

		const mapped = editModule.toFormValues(editRow.raw);
		return {
			...mapped,
			recordId: editRow.id,
			serviceId: editRow.serviceId,
			serviceCode: editRow.serviceCode,
			fiscalYear: mapped.fiscalYear ?? editRow.fiscalYear,
		};
	}, [editModule, editRow]);

	return (
		<PredictionForm
			initialValues={initialValues}
			mode={editRow ? "edit" : "create"}
			titleKey={editRow ? "prediction.titles.edit" : "prediction.titles.create"}
			submitting={submitting}
			onSubmit={async (values, form, submitMode) => {
				setSubmitting(true);
				try {
					const wasUpdate = Boolean(values.recordId);
					const saved = await submitPrediction(values) as { id: number };
					window.$message?.success(t(
						wasUpdate
							? "prediction.messages.updateSuccess"
							: SUBMIT_SUCCESS_MESSAGE_KEYS[submitMode],
					));
					if (submitMode === "create_and_edit") {
						form.reset({ ...values, recordId: saved.id });
					}
					else if (submitMode === "create_another") {
						form.reset({
							...emptyPredictionValues,
							serviceId: values.serviceId,
							serviceCode: values.serviceCode,
							fiscalYear: values.fiscalYear,
							serviceFields: {
								...predictionServiceRegistry[values.serviceCode!]?.createEmptyServiceFields(values.serviceFields),
							},
						});
					}
					else {
						form.reset(emptyPredictionValues);
					}
					if (editRow)
						navigate("/predictions/new", { replace: true, state: null });
				}
				finally {
					setSubmitting(false);
				}
			}}
		/>
	);
}

export default CreatePrediction;
