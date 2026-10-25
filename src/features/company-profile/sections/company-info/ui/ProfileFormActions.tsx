import { FormActionBar } from "#src/shared/ui/form-action-bar";
import { App, Button } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
	const { t } = useTranslation();
	const { modal } = App.useApp();
	const [isDeleting, setIsDeleting] = useState(false);

	function confirmDelete() {
		modal.confirm({
			title: t("companyProfile.profile.deleteTitle"),
			content: t("companyProfile.profile.deleteContent"),
			okText: t("companyProfile.profile.delete"),
			cancelText: t("common.cancel"),
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
								{t("companyProfile.profile.delete")}
							</Button>
							<Button
								disabled={submitDisabled || isSubmitting || isDeleting || !isDirty}
								onClick={onReset}
							>
								{t("companyProfile.profile.reset")}
							</Button>
						</>
					)}
					<Button
						type="primary"
						loading={isSubmitting}
						disabled={submitDisabled || isDeleting || !isDirty || !isValid}
						onClick={onSubmit}
					>
						{t("companyProfile.profile.submit")}
					</Button>
				</>
			)}
		/>
	);
}
