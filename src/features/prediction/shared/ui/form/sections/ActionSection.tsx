import { Button } from "antd";
import { useTranslation } from "react-i18next";

interface Props {
	submitting?: boolean
	onSubmit: () => void
	onSubmitAndCreateAnother: () => void
	onSubmitAndEdit: () => void
	onReset: () => void
}

export function ActionSection({
	submitting,
	onSubmit,
	onSubmitAndCreateAnother,
	onSubmitAndEdit,
	onReset,
}: Props) {
	const { t } = useTranslation();

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
