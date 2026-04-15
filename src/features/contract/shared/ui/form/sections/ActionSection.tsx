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
			style={{
				width: "100%",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				gap: 12,
				flexWrap: "wrap",
			}}
		>
			<Button onClick={onReset}>پاکسازی فرم</Button>

			<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
