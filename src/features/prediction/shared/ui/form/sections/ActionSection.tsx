import { FormActionBar } from "#src/shared/ui/form-action-bar";
import { Button } from "antd";
import { useTranslation } from "react-i18next";

interface Props {
	submitting?: boolean
	disabled?: boolean
	onSubmit: () => void
}

export function ActionSection({
	submitting,
	disabled,
	onSubmit,
}: Props) {
	const { t } = useTranslation();

	return (
		<FormActionBar
			primaryActions={(
				<Button type="primary" loading={!!submitting} disabled={disabled || submitting} onClick={onSubmit}>
					{t("prediction.actions.submit")}
				</Button>
			)}
		/>
	);
}
