import type { PublicProfileDto } from "#src/features/company-profile/api/company-profile.api";
import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import type { PublicProfileFormValues } from "../../model/public/company-public.mappers";
import {
	createPublicProfile,
	getPublicProfile,
	updatePublicProfile,
} from "#src/features/company-profile/api/company-profile.api";
import { useAccess } from "#src/hooks";

import { Spin } from "antd";

import React, { useEffect, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";
import {
	dtoToPublicForm,
	emptyPublicProfileValues,
	publicFormToPayload,

} from "../../model/public/company-public.mappers";
import PublicProfileForm from "./PublicProfileForm";

export default function PublicProfilePanel({ companyId }: { companyId: number }) {
	const [loading, setLoading] = useState(true);
	const [editMode, setEditMode] = useState(false);

	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" }) || 0;
	const { hasDomainPermissionByServiceId } = useAccess();
	const canUpdateProfile = hasDomainPermissionByServiceId("company_profile", "update", serviceId);
	const [profile, setProfile] = useState<PublicProfileDto | null>(null);

	const defaultValues = useMemo<PublicProfileFormValues>(() => {
		if (!profile)
			return { ...emptyPublicProfileValues, company: companyId, service: serviceId };
		return dtoToPublicForm(profile, { companyId, serviceId });
	}, [profile, companyId, serviceId]);

	useEffect(() => {
		setLoading(true);
		getPublicProfile({ company: companyId, service: serviceId })
			.then(res => setProfile(res))
			.finally(() => {
				setLoading(false);
				setEditMode(false);
			});
	}, [companyId, serviceId]);

	async function onSubmit(values: PublicProfileFormValues) {
		if (!canUpdateProfile) {
			window.$message?.warning("دسترسی ویرایش پروفایل شرکت ندارید.");
			return;
		}
		try {
			const payload = publicFormToPayload(values);

			if (!profile) {
				const created = await createPublicProfile(payload);
				setProfile(created);
				setEditMode(false);
				window.$message?.success("اطلاعات عمومی شرکت ایجاد شد");
				return;
			}

			const updated = await updatePublicProfile(profile.id, payload);
			setProfile(updated);
			setEditMode(false);
			window.$message?.success("اطلاعات عمومی ذخیره شد");
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

			<PublicProfileForm
				key={profile?.id ?? "new"}
				disabled={!editMode}
				defaultValues={defaultValues}
				onSubmit={onSubmit}
			/>
		</div>
	);
}
