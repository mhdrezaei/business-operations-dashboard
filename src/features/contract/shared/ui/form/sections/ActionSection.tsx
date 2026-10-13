import { FormActionBar } from "#src/shared/ui/form-action-bar";
import { Button, Tooltip } from "antd";

interface Props {
	submitting?: boolean
	disabled?: boolean
	submitText: string
	onSubmit: () => void
	onSubmitAndCreateAnother: () => void
	onSubmitAndEdit: () => void
	canSubmitAndEdit: boolean
	onReset: () => void
}

export function ActionSection({
	submitting,
	disabled,
	submitText,
	onSubmit,
	onSubmitAndCreateAnother,
	onSubmitAndEdit,
	canSubmitAndEdit,
	onReset,
}: Props) {
	return (
		<FormActionBar
			secondaryActions={<Button danger onClick={onReset}>پاکسازی فرم</Button>}
			primaryActions={(
				<>
					<Button loading={!!submitting} disabled={disabled || submitting} onClick={onSubmitAndCreateAnother}>
						ثبت و ایجاد قرارداد جدید
					</Button>
					<Tooltip title={canSubmitAndEdit ? undefined : "برای این سرویس دسترسی ویرایش ندارید"}>
						<span>
							<Button loading={!!submitting} disabled={disabled || submitting || !canSubmitAndEdit} onClick={onSubmitAndEdit}>
								ثبت و ویرایش
							</Button>
						</span>
					</Tooltip>
					<Button type="primary" loading={!!submitting} disabled={disabled || submitting} onClick={onSubmit}>
						{submitText}
					</Button>
				</>
			)}
		/>
	);
}
