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
				style={{
					display: "flex",
					justifyContent: "flex-end",
					alignItems: "center",
					gap: 12,
					flexWrap: "wrap",
				}}
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
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				gap: 12,
				flexWrap: "wrap",
			}}
		>
			<Button onClick={onReset}>{t("prediction.actions.clearForm")}</Button>

			<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
