import type { BankAccountDto, BankAccountFormValues } from "../model/bank-accounts.types";
import { Modal } from "antd";
import React, { useMemo, useState } from "react";
import { createBankAccount, updateBankAccount } from "../../../api/bank-accounts.api";
import { bankAccountFormToPayload, dtoToBankAccountForm, emptyBankAccountValues } from "../model/bank-accounts.mappers";
import BankAccountForm from "./BankAccountForm";

interface Props {
	open: boolean
	serviceId: number
	companyId: number
	editing: BankAccountDto | null
	onClose: () => void
	onSaved: () => void
}

export default function BankAccountModal({ open, serviceId, companyId, editing, onClose, onSaved }: Props) {
	const [saving, setSaving] = useState(false);

	const title = useMemo(() => (editing ? "ویرایش حساب" : "ثبت حساب"), [editing]);

	const initialValues: BankAccountFormValues = useMemo(() => {
		return editing ? dtoToBankAccountForm(editing) : emptyBankAccountValues;
	}, [editing]);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title={title}
			footer={null}
			width={760}
			destroyOnClose
		>
			<BankAccountForm
				disabled={saving}
				defaultValues={initialValues}
				onSubmit={async (values) => {
					setSaving(true);
					try {
						const payload = bankAccountFormToPayload(values, { serviceId, companyId });

						if (editing) {
							await updateBankAccount(editing.id, payload);
							window.$message?.success("با موفقیت ویرایش شد");
						}
						else {
							await createBankAccount(payload);
							window.$message?.success("با موفقیت ثبت شد");
						}

						onSaved();
						onClose();
					}
					finally {
						setSaving(false);
					}
				}}
			/>
		</Modal>
	);
}
