import type { InternalProfileDto } from "#src/features/company-profile/api/company-profile.api";
import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import type { InternalProfileFormValues } from "../../model/internal/company-internal.mappers";
import {
	createInternalProfile,
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
	const [editMode, setEditMode] = useState(false);

	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" }) || 0;
	const companyType = useWatch<CompanyProfileFormValues, "companyType">({ name: "companyType" });
	const { hasDomainPermissionByServiceId } = useAccess();
	const canUpdateProfile = hasDomainPermissionByServiceId("company_profile", "update", serviceId, companyType);
	const [profile, setProfile] = useState<InternalProfileDto | null>(null);

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
				setEditMode(false);
			});
	}, [companyId, serviceId, companyType]);

	async function onSubmit(values: InternalProfileFormValues) {
		if (!canUpdateProfile) {
			window.$message?.warning("دسترسی ویرایش پروفایل شرکت ندارید.");
			return;
		}
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
	}

	if (loading)
		return <div className="p-4"><Spin /></div>;

	return (
		<div>

			<InternalProfileForm
				key={profile?.id ?? "new"}
				disabled={!editMode}
				defaultValues={defaultValues}
				onSubmit={onSubmit}
			/>
		</div>
	);
}
