import type { InternalProfileDto } from "#src/features/company-profile/api/company-profile.api";
import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import type { InternalProfileFormValues } from "../../model/internal/company-internal.mappers";
import {
	createInternalProfile,
	getInternalProfile,

	updateInternalProfile,
} from "#src/features/company-profile/api/company-profile.api";
import { Button, Spin } from "antd";

import React, { useEffect, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";
import {
	dtoToInternalForm,
	emptyInternalProfileValues,
	internalFormToPayload,

} from "../../model/internal/company-internal.mappers";

import InternalProfileForm from "./InternalProfileForm";

export default function InternalProfilePanel({ companyId }: { companyId: number }) {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [editMode, setEditMode] = useState(false);

	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" }) || 0;
	const [profile, setProfile] = useState<InternalProfileDto | null>(null);

	const defaultValues = useMemo<InternalProfileFormValues>(() => {
		if (!profile)
			return { ...emptyInternalProfileValues, company: companyId, service: serviceId };
		return dtoToInternalForm(profile, { companyId, serviceId });
	}, [profile, companyId, serviceId]);

	useEffect(() => {
		setLoading(true);
		getInternalProfile({ company: companyId, service: serviceId })
			.then(res => setProfile(res))
			.finally(() => {
				setLoading(false);
				setEditMode(false);
			});
	}, [companyId, serviceId]);

	async function onSubmit(values: InternalProfileFormValues) {
		setSaving(true);
		try {
			const payload = internalFormToPayload(values);

			if (!profile) {
				const created = await createInternalProfile(payload);
				setProfile(created);
				setEditMode(false);
				window.$message?.success("اطلاعات داخلی ایجاد شد");
				return;
			}

			const updated = await updateInternalProfile(profile.id, payload);
			setProfile(updated);
			setEditMode(false);
			window.$message?.success("اطلاعات داخلی ذخیره شد");
		}
		catch (error) {
			console.error(error);
			window.$message?.error("در حال حاضر مشکلی وجود دارد");
		}
		finally {
			setSaving(false);
		}
	}

	if (loading)
		return <div style={{ padding: 16 }}><Spin /></div>;

	return (
		<div>
			<div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 12 }}>
				{!editMode
					? <Button type="primary" onClick={() => setEditMode(true)}>ویرایش</Button>
					: <Button onClick={() => setEditMode(false)} disabled={saving}>انصراف</Button>}
			</div>

			<InternalProfileForm
				key={profile?.id ?? "new"}
				disabled={!editMode}
				defaultValues={defaultValues}
				onSubmit={onSubmit}
			/>
		</div>
	);
}
