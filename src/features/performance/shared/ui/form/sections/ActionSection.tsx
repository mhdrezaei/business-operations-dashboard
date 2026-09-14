import { FormActionBar } from "#src/shared/ui/form-action-bar";
import { HistoryOutlined, UploadOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useTranslation } from "react-i18next";

interface Props {
	submitting?: boolean
	onSubmit: () => void
	onSubmitAndCreateAnother: () => void
	onSubmitAndEdit: () => void
	onReset: () => void
	showSmsGatewayImport?: boolean
	onSmsGatewayImport?: () => void
	onSmsGatewayImportHistory?: () => void
	showSubmitAndCreateAnother?: boolean
}

export function ActionSection({
	submitting,
	onSubmit,
	onSubmitAndCreateAnother,
	onSubmitAndEdit,
	onReset,
	showSmsGatewayImport,
	onSmsGatewayImport,
	onSmsGatewayImportHistory,
	showSubmitAndCreateAnother = true,
}: Props) {
	const { t } = useTranslation();

	return (
		<FormActionBar
			secondaryActions={(
				<>
					{showSmsGatewayImport
						? (
							<>
								<Button icon={<UploadOutlined />} onClick={onSmsGatewayImport}>ثبت عملکرد از Gateway پیامک</Button>
								<Button icon={<HistoryOutlined />} onClick={onSmsGatewayImportHistory}>تاریخچه دریافت‌های Gateway پیامک</Button>
							</>
						)
						: null}
					<Button danger onClick={onReset}>{t("performance.actions.clearForm")}</Button>
				</>
			)}
			primaryActions={(
				<>
					{showSubmitAndCreateAnother
						? (
							<Button loading={!!submitting} onClick={onSubmitAndCreateAnother}>
								{t("performance.actions.submitAndCreateAnother")}
							</Button>
						)
						: null}
					<Button loading={!!submitting} onClick={onSubmitAndEdit}>
						{t("performance.actions.submitAndEdit")}
					</Button>
					<Button type="primary" loading={!!submitting} onClick={onSubmit}>
						{t("performance.actions.submit")}
					</Button>
				</>
			)}
		/>
	);
}
