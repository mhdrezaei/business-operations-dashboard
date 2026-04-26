import { Button } from "antd";

interface Props {
	submitting?: boolean
	submitText: string
	onSubmit: () => void
	onSubmitAndCreateAnother: () => void
	onSubmitAndEdit: () => void
	onReset: () => void
}

export function ActionSection({
	submitting,
	submitText,
	onSubmit,
	onSubmitAndCreateAnother,
	onSubmitAndEdit,
	onReset,
}: Props) {
	return (
		<div
			className="w-full flex justify-between items-center gap-3 flex-wrap"
		>
			<Button onClick={onReset}>پاکسازی فرم</Button>

			<div className="flex gap-2 flex-wrap">
				<Button loading={!!submitting} onClick={onSubmit}>
					{submitText}
				</Button>
				<Button loading={!!submitting} onClick={onSubmitAndCreateAnother}>
					ثبت و ایجاد یکی دیگر
				</Button>
				<Button loading={!!submitting} type="primary" onClick={onSubmitAndEdit}>
					ثبت و ویرایش
				</Button>
			</div>
		</div>
	);
}
