import type { CompanyPersonContactItem, CompanyPersonFormValues } from "../model/company-people.types";
import { useQuery } from "@tanstack/react-query";

import { Modal } from "antd";
import React, { useMemo, useState } from "react";
import { createCompanyPerson, updateCompanyPerson } from "../../../api/key-people.api";
import { companyPersonDetailQuery } from "../../../queries/company-people.queries";
import { companyPersonFormToPayload, dtoToCompanyPersonForm } from "../model/company-people.mappers";
import CompanyPeopleForm from "./CompanyPeopleForm";

interface Props {
	open: boolean
	companyId: number
	serviceId: number
	personId: number | null
	onClose: () => void
	onUpdated?: () => void
}

function ensureVisibleField(values: CompanyPersonContactItem[]) {
	return values.length ? values : [{ value: "" }];
}

export default function CompanyPeopleModal({ open, companyId, serviceId, personId, onClose, onUpdated }: Props) {
	const [saving, setSaving] = useState(false);

	const detail = useQuery(companyPersonDetailQuery(open && personId ? personId : null));

	const title = useMemo(() => (personId ? "ویرایش شخص کلیدی" : "ثبت شخص"), [personId]);

	const initialValues: CompanyPersonFormValues | null = useMemo(() => {
		if (!personId) {
			return {
				role: null,
				full_name: "",
				is_signatory: false,
				national_id: "",
				title: "",
				phone: [{ value: "" }],
				email: [{ value: "" }],
			};
		}
		if (!detail.data)
			return null;

		const base = dtoToCompanyPersonForm(detail.data);
		return {
			...base,
			phone: ensureVisibleField(base.phone),
			email: ensureVisibleField(base.email),
		};
	}, [personId, detail.data]);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title={title}
			footer={null}
			width={800}
			destroyOnClose
		>
			{!initialValues
				? null
				: (
					<CompanyPeopleForm
						disabled={false}
						defaultValues={initialValues}
						submitText={personId ? "اعمال تغییرات" : "ثبت شخص"}
						submitting={saving}
						onClose={onClose}
						onSubmit={async (values) => {
							setSaving(true);
							try {
								const payload = companyPersonFormToPayload(companyId, serviceId, values);
								if (personId) {
									await updateCompanyPerson(personId, payload);
								}

								else {
									await createCompanyPerson(payload);
								}

								onUpdated?.();
								onClose();
								window.$message?.success("عملیات با موفقیت انجام شد");
							}
							finally {
								setSaving(false);
							}
						}}
					/>
				)}
		</Modal>
	);
}
