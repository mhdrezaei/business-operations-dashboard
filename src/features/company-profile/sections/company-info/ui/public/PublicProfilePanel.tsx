import type { PublicProfileDto } from "#src/features/company-profile/api/company-profile.api";
import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import type { PublicProfileFormValues } from "../../model/public/company-public.mappers";
import {
	createPublicProfile,
	getPublicProfile,
	updatePublicProfile,
} from "#src/features/company-profile/api/company-profile.api";
import { useAccess } from "#src/hooks";

import { Button, Spin } from "antd";

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
	const companyType = useWatch<CompanyProfileFormValues, "companyType">({ name: "companyType" });
	const { hasDomainPermissionByServiceId } = useAccess();
	const canUpdateProfile = hasDomainPermissionByServiceId("company_profile", "update", serviceId, companyType);
	const [profile, setProfile] = useState<PublicProfileDto | null>(null);

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
				setEditMode(false);
			});
	}, [companyId, serviceId, companyType]);

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
		return <div className="p-4"><Spin /></div>;

	return (
		<div>
			<div className="mb-3 flex justify-end">
				<Button
					type="primary"
					disabled={!canUpdateProfile}
					onClick={() => setEditMode(true)}
				>
					ویرایش
				</Button>
			</div>

			<PublicProfileForm
				key={profile?.id ?? "new"}
				disabled={!editMode}
				defaultValues={defaultValues}
				onSubmit={onSubmit}
			/>
		</div>
	);
}
