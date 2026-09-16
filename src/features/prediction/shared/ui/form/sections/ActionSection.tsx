import { FormActionBar } from "#src/shared/ui/form-action-bar";
import { Button } from "antd";
import { useTranslation } from "react-i18next";

interface Props {
	mode?: "create" | "edit"
	submitting?: boolean
	disabled?: boolean
	onSubmit: () => void
	onSubmitAndCreateAnother: () => void
	onSubmitAndEdit: () => void
	onReset: () => void
	onCancel?: () => void
}

export function ActionSection({
	mode = "create",
	submitting,
	disabled,
	onSubmit,
	onSubmitAndCreateAnother,
	onSubmitAndEdit,
	onReset,
	onCancel,
}: Props) {
	const { t } = useTranslation();

	if (mode === "edit") {
		return (
			<FormActionBar
				secondaryActions={onCancel ? <Button onClick={onCancel}>{t("common.cancel")}</Button> : undefined}
				primaryActions={(
					<Button loading={!!submitting} disabled={disabled || submitting} type="primary" onClick={onSubmit}>
						{t("prediction.actions.saveChanges")}
					</Button>
				)}
			/>
		);
	}

	return (
		<FormActionBar
			secondaryActions={<Button danger onClick={onReset}>{t("prediction.actions.clearForm")}</Button>}
			primaryActions={(
				<>
					<Button loading={!!submitting} disabled={disabled || submitting} onClick={onSubmitAndCreateAnother}>
						{t("prediction.actions.submitAndCreateAnother")}
					</Button>
					<Button loading={!!submitting} disabled={disabled || submitting} onClick={onSubmitAndEdit}>
						{t("prediction.actions.submitAndEdit")}
					</Button>
					<Button loading={!!submitting} disabled={disabled || submitting} onClick={onSubmit}>
						{t("prediction.actions.submit")}
					</Button>
				</>
			)}
		/>
	);
}
