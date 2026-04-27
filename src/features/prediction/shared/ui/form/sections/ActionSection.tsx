import { Button } from "antd";
import { useTranslation } from "react-i18next";

interface Props {
	mode?: "create" | "edit"
	submitting?: boolean
	onSubmit: () => void
	onSubmitAndCreateAnother: () => void
	onSubmitAndEdit: () => void
	onReset: () => void
	onCancel?: () => void
}

export function ActionSection({
	mode = "create",
	submitting,
	onSubmit,
	onSubmitAndCreateAnother,
	onSubmitAndEdit,
	onReset,
	onCancel,
}: Props) {
	const { t } = useTranslation();

	if (mode === "edit") {
		return (
			<div
				className="flex justify-end items-center gap-3 flex-wrap"
			>
				{onCancel
					? <Button onClick={onCancel}>{t("common.cancel")}</Button>
					: null}
				<Button loading={!!submitting} type="primary" onClick={onSubmit}>
					{t("prediction.actions.saveChanges")}
				</Button>
			</div>
		);
	}

	return (
		<div
			className="flex justify-between items-center gap-3 flex-wrap"
		>
			<Button onClick={onReset}>{t("prediction.actions.clearForm")}</Button>

			<div className="flex gap-2 flex-wrap">
				<Button loading={!!submitting} onClick={onSubmit}>
					{t("prediction.actions.submit")}
				</Button>
				<Button loading={!!submitting} onClick={onSubmitAndCreateAnother}>
					{t("prediction.actions.submitAndCreateAnother")}
				</Button>
				<Button loading={!!submitting} type="primary" onClick={onSubmitAndEdit}>
					{t("prediction.actions.submitAndEdit")}
				</Button>
			</div>
		</div>
	);
}
