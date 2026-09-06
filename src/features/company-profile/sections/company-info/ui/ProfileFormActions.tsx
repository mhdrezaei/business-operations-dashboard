import { FormActionBar } from "#src/shared/ui/form-action-bar";
import { App, Button } from "antd";
import { useState } from "react";

interface Props {
	hasProfile: boolean
	isDirty: boolean
	isValid: boolean
	isSubmitting: boolean
	submitDisabled: boolean
	deleteDisabled: boolean
	onSubmit: () => void
	onReset: () => void
	onDelete: () => void | Promise<void>
}

export function ProfileFormActions({
	hasProfile,
	isDirty,
	isValid,
	isSubmitting,
	submitDisabled,
	deleteDisabled,
	onSubmit,
	onReset,
	onDelete,
}: Props) {
	const { modal } = App.useApp();
	const [isDeleting, setIsDeleting] = useState(false);

	function confirmDelete() {
		modal.confirm({
			title: "حذف پروفایل",
			content: "با حذف پروفایل، اطلاعات این بخش پاک می‌شود. آیا مطمئن هستید؟",
			okText: "حذف پروفایل",
			cancelText: "انصراف",
			okButtonProps: { danger: true },
			onOk: async () => {
				setIsDeleting(true);
				try {
					await onDelete();
				}
				finally {
					setIsDeleting(false);
				}
			},
		});
	}

	return (
		<FormActionBar
			primaryActions={(
				<>
					{hasProfile && (
						<>
							<Button
								danger
								loading={isDeleting}
								disabled={deleteDisabled || isSubmitting}
								onClick={confirmDelete}
							>
								حذف پروفایل
							</Button>
							<Button
								disabled={submitDisabled || isSubmitting || isDeleting || !isDirty}
								onClick={onReset}
							>
								بازنشانی تغییرات
							</Button>
						</>
					)}
					<Button
						type="primary"
						loading={isSubmitting}
						disabled={submitDisabled || isDeleting || !isDirty || !isValid}
						onClick={onSubmit}
					>
						ثبت
					</Button>
				</>
			)}
		/>
	);
}
