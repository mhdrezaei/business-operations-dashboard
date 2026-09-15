import type { PublicProfileDto } from "#src/features/company-profile/api/company-profile.api";
import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import type { PublicProfileFormValues } from "../../model/public/company-public.mappers";
import {
	createPublicProfile,
	deletePublicProfile,
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

	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" }) || 0;
	const companyType = useWatch<CompanyProfileFormValues, "companyType">({ name: "companyType" });
	const { hasDomainPermissionByServiceId } = useAccess();
	const canCreateProfile = hasDomainPermissionByServiceId("company_profile", "create", serviceId, companyType);
	const canUpdateProfile = hasDomainPermissionByServiceId("company_profile", "update", serviceId, companyType);
	const canDeleteProfile = hasDomainPermissionByServiceId("company_profile", "delete", serviceId, companyType);
	const [profile, setProfile] = useState<PublicProfileDto | null>(null);
	const canEditProfile = canCreateProfile || canUpdateProfile;
	const canSubmitProfile = profile ? canUpdateProfile : canCreateProfile;

	const defaultValues = useMemo<PublicProfileFormValues>(() => {
		if (!profile)
			return { ...emptyPublicProfileValues, company: companyId, service: serviceId };
		return dtoToPublicForm(profile, { companyId, serviceId });
	}, [profile, companyId, serviceId]);

	useEffect(() => {
		setLoading(true);
		getPublicProfile({ company: companyId, service: serviceId, company_type: companyType })
			.then(res => setProfile(res))
			.finally(() => {
				setLoading(false);
			});
	}, [companyId, serviceId, companyType]);

	async function onSubmit(values: PublicProfileFormValues) {
		if (!canSubmitProfile) {
			window.$message?.warning(profile ? "دسترسی ویرایش پروفایل شرکت ندارید." : "دسترسی ایجاد پروفایل شرکت ندارید.");
			return;
		}
		try {
			const payload = publicFormToPayload(values);

			if (!profile) {
				const created = await createPublicProfile(payload);
				setProfile(created);
				window.$message?.success("اطلاعات عمومی شرکت ایجاد شد");
				return;
			}

			const updated = await updatePublicProfile(profile.id, payload);
			setProfile(updated);
			window.$message?.success("اطلاعات عمومی ذخیره شد");
		}
		catch (error) {
			console.error(error);
			window.$message?.error("در حال حاضر مشکلی وجود دارد");
		}
	}

	async function onDelete() {
		if (!profile)
			return;
		if (!canDeleteProfile) {
			window.$message?.warning("دسترسی حذف پروفایل شرکت ندارید.");
			return;
		}

		try {
			await deletePublicProfile(profile.id);
			setProfile(null);
			window.$message?.success("پروفایل عمومی شرکت حذف شد");
		}
		catch (error) {
			console.error(error);
			window.$message?.error("در حال حاضر مشکلی وجود دارد");
			throw error;
		}
	}

	if (loading)
		return <div className="p-4"><Spin /></div>;

	return (
		<div className="company-profile-panel">
			<PublicProfileForm
				key={profile?.id ?? "new"}
				disabled={!canEditProfile}
				submitDisabled={!canSubmitProfile}
				hasProfile={!!profile}
				deleteDisabled={!canDeleteProfile}
				defaultValues={defaultValues}
				onSubmit={onSubmit}
				onDelete={onDelete}
			/>
		</div>
	);
}
