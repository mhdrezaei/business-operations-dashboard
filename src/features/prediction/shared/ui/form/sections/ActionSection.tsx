import type { PredictionSubmitMode } from "../../../model/prediction.form.types";
import { FormActionBar } from "#src/shared/ui/form-action-bar";
import { Button } from "antd";
import { useTranslation } from "react-i18next";

interface Props {
	submitting?: boolean
	disabled?: boolean
	onSubmit: (mode: PredictionSubmitMode) => void
	onClear: () => void
}

export function ActionSection({
	submitting,
	disabled,
	onSubmit,
	onClear,
}: Props) {
	const { t } = useTranslation();

	return (
		<FormActionBar
			secondaryActions={(
				<Button disabled={submitting} onClick={onClear}>
					{t("prediction.actions.clearForm")}
				</Button>
			)}
			primaryActions={(
				<>
					<Button loading={!!submitting} disabled={disabled || submitting} onClick={() => onSubmit("create_another")}>
						{t("prediction.actions.submitAndCreateAnother")}
					</Button>
					<Button loading={!!submitting} disabled={disabled || submitting} onClick={() => onSubmit("create_and_edit")}>
						{t("prediction.actions.submitAndEdit")}
					</Button>
					<Button type="primary" loading={!!submitting} disabled={disabled || submitting} onClick={() => onSubmit("create_reset")}>
						{t("prediction.actions.submit")}
					</Button>
				</>
			)}
		/>
	);
}
