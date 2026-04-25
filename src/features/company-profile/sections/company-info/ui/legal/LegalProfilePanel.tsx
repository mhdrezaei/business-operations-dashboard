import type { LegalProfileDto } from "#src/features/company-profile/api/company-profile.api";
import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import type { LegalProfileFormValues } from "../../model/legal/company-legal.mappers";
import {
	createLegalProfile,
	getLegalProfile,

	updateLegalProfile,
} from "#src/features/company-profile/api/company-profile.api";
import { useAccess } from "#src/hooks";
import { Spin } from "antd";

import React, { useEffect, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";
import {
	dtoToLegalForm,
	emptyLegalProfileValues,
	legalFormToPayload,

} from "../../model/legal/company-legal.mappers";

import LegalProfileForm from "./LegalProfileForm";

export default function LegalProfilePanel({ companyId }: { companyId: number }) {
	const [loading, setLoading] = useState(true);
	const [editMode, setEditMode] = useState(false);

	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" }) || 0;
	const { hasDomainPermissionByServiceId } = useAccess();
	const canUpdateProfile = hasDomainPermissionByServiceId("company_profile", "update", serviceId);
	const [profile, setProfile] = useState<LegalProfileDto | null>(null);

	const defaultValues = useMemo<LegalProfileFormValues>(() => {
		if (!profile)
			return { ...emptyLegalProfileValues, company: companyId, service: serviceId };
		return dtoToLegalForm(profile, { companyId, serviceId });
	}, [profile, companyId, serviceId]);

	useEffect(() => {
		setLoading(true);
		getLegalProfile({ company: companyId, service: serviceId })
			.then(res => setProfile(res))
			.finally(() => {
				setLoading(false);
				setEditMode(false);
			});
	}, [companyId, serviceId]);

	async function onSubmit(values: LegalProfileFormValues) {
		if (!canUpdateProfile) {
			window.$message?.warning("دسترسی ویرایش پروفایل شرکت ندارید.");
			return;
		}
		try {
			const payload = legalFormToPayload(values);

			if (!profile) {
				const created = await createLegalProfile(payload);
				setProfile(created);
				setEditMode(false);
				window.$message?.success("اطلاعات حقوقی ایجاد شد");
				return;
			}

			const updated = await updateLegalProfile(profile.id, payload);
			setProfile(updated);
			setEditMode(false);
			window.$message?.success("اطلاعات حقوقی ذخیره شد");
		}
		catch (error) {
			console.error(error);
			window.$message?.error("در حال حاضر مشکلی وجود دارد");
		}
	}

	if (loading)
		return <div style={{ padding: 16 }}><Spin /></div>;

	return (
		<div>

			<LegalProfileForm
				key={profile?.id ?? "new"}
				disabled={!editMode}
				defaultValues={defaultValues}
				onSubmit={onSubmit}
			/>
		</div>
	);
}
