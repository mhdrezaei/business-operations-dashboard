import { Button } from "antd";

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
			<Button onClick={onReset}>پاکسازی فرم</Button>

			<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
				<Button loading={!!submitting} onClick={onSubmit}>
					ثبت
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
