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
			className="flex justify-between items-center gap-3 flex-wrap"
		>
			<Button onClick={onReset}>{t("performance.actions.clearForm")}</Button>

			<div className="flex gap-2 flex-wrap">
				<Button loading={!!submitting} onClick={onSubmit}>
					{t("performance.actions.submit")}
				</Button>
				<Button loading={!!submitting} onClick={onSubmitAndCreateAnother}>
					{t("performance.actions.submitAndCreateAnother")}
				</Button>
				<Button loading={!!submitting} type="primary" onClick={onSubmitAndEdit}>
					{t("performance.actions.submitAndEdit")}
				</Button>
			</div>
		</div>
	);
}
