import type { InternalProfileDto } from "#src/features/company-profile/api/company-profile.api";
import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import type { InternalProfileFormValues } from "../../model/internal/company-internal.mappers";
import {
	createInternalProfile,
	deleteInternalProfile,
	getInternalProfile,
	updateInternalProfile,
} from "#src/features/company-profile/api/company-profile.api";
import { useAccess } from "#src/hooks";
import { Spin } from "antd";

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

	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" }) || 0;
	const companyType = useWatch<CompanyProfileFormValues, "companyType">({ name: "companyType" });
	const { hasDomainPermissionByServiceId } = useAccess();
	const canCreateProfile = hasDomainPermissionByServiceId("company_profile", "create", serviceId, companyType);
	const canUpdateProfile = hasDomainPermissionByServiceId("company_profile", "update", serviceId, companyType);
	const canDeleteProfile = hasDomainPermissionByServiceId("company_profile", "delete", serviceId, companyType);
	const [profile, setProfile] = useState<InternalProfileDto | null>(null);
	const canEditProfile = canCreateProfile || canUpdateProfile;
	const canSubmitProfile = profile ? canUpdateProfile : canCreateProfile;

	const defaultValues = useMemo<InternalProfileFormValues>(() => {
		if (!profile)
			return { ...emptyInternalProfileValues, company: companyId, service: serviceId };
		return dtoToInternalForm(profile, { companyId, serviceId });
	}, [profile, companyId, serviceId]);

	useEffect(() => {
		setLoading(true);
		getInternalProfile({ company: companyId, service: serviceId, company_type: companyType })
			.then(res => setProfile(res))
			.finally(() => {
				setLoading(false);
			});
	}, [companyId, serviceId, companyType]);

	async function onSubmit(values: InternalProfileFormValues) {
		if (!canSubmitProfile) {
			window.$message?.warning(profile ? "دسترسی ویرایش پروفایل شرکت ندارید." : "دسترسی ایجاد پروفایل شرکت ندارید.");
			return;
		}
		try {
			const payload = internalFormToPayload(values);

			if (!profile) {
				const created = await createInternalProfile(payload);
				setProfile(created);
				window.$message?.success("اطلاعات داخلی ایجاد شد");
				return;
			}

			const updated = await updateInternalProfile(profile.id, payload);
			setProfile(updated);
			window.$message?.success("اطلاعات داخلی ذخیره شد");
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
			await deleteInternalProfile(profile.id);
			setProfile(null);
			window.$message?.success("پروفایل داخلی حذف شد");
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
			<InternalProfileForm
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
