import type { ShareholderDto, ShareholderFormValues } from "../model/shareholders.types";
import { Modal } from "antd";

import React, { useMemo, useState } from "react";
import { createShareholder, updateShareholder } from "../../../api/shareholders.api";
import { dtoToShareholderForm, emptyShareholderValues, shareholderFormToPayload } from "../model/shareholders.mappers";
import ShareholderForm from "./ShareholderForm";

interface Props {
	open: boolean
	mode: "create" | "edit"
	serviceId: number
	companyId: number
	initial?: ShareholderDto | null
	onClose: () => void
	onSaved?: () => void
}

export default function ShareholderUpsertModal({ open, mode, serviceId, companyId, initial, onClose, onSaved }: Props) {
	const [saving, setSaving] = useState(false);

	const title = useMemo(() => (mode === "edit" ? "ویرایش سهامدار" : "ثبت سهامدار"), [mode]);

	const defaultValues: ShareholderFormValues = useMemo(() => {
		if (mode === "edit" && initial)
			return dtoToShareholderForm(initial);
		return emptyShareholderValues;
	}, [mode, initial]);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title={title}
			footer={null}
			destroyOnClose
			width={720}
		>
			<ShareholderForm
				disabled={saving}
				defaultValues={defaultValues}
				submitText={mode === "edit" ? "اعمال تغییرات" : "ثبت سهامدار"}
				submitting={saving}
				onSubmit={async (values) => {
					setSaving(true);
					try {
						const payload = shareholderFormToPayload(values, { service: serviceId, company: companyId });

						if (mode === "edit" && initial) {
							await updateShareholder(initial.id, payload);
						}
						else {
							await createShareholder(payload);
						}

						window.$message?.success("با موفقیت ذخیره شد");
						onSaved?.();
						onClose();
					}
					catch (error) {
						window.$message?.error("در حال حاضر مشکلی وجود دارد");
						console.error(error);
					}
					finally {
						setSaving(false);
					}
				}}
			/>
		</Modal>
	);
}
