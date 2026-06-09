import type { FinanceProfileDto } from "#src/features/company-profile/api/company-profile.api";
import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import type { FinanceProfileFormValues } from "../../model/finance/company-finance.mappers";
import {
	createFinanceProfile,

	getFinanceProfile,
	updateFinanceProfile,
} from "#src/features/company-profile/api/company-profile.api";
import { useAccess } from "#src/hooks";
import { Button, Spin } from "antd";

import React, { useEffect, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";
import {
	dtoToFinanceForm,
	emptyFinanceProfileValues,
	financeFormToPayload,

} from "../../model/finance/company-finance.mappers";

import FinanceProfileForm from "./FinanceProfileForm";

export default function FinanceProfilePanel({ companyId }: { companyId: number }) {
	const [loading, setLoading] = useState(true);
	const [editMode, setEditMode] = useState(false);

	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" }) || 0;
	const companyType = useWatch<CompanyProfileFormValues, "companyType">({ name: "companyType" });
	const { hasDomainPermissionByServiceId } = useAccess();
	const canUpdateProfile = hasDomainPermissionByServiceId("company_profile", "update", serviceId, companyType);
	const [profile, setProfile] = useState<FinanceProfileDto | null>(null);

	const defaultValues = useMemo<FinanceProfileFormValues>(() => {
		if (!profile)
			return { ...emptyFinanceProfileValues, company: companyId, service: serviceId };
		return dtoToFinanceForm(profile, { companyId, serviceId });
	}, [profile, companyId, serviceId]);

	useEffect(() => {
		setLoading(true);
		getFinanceProfile({ company: companyId, service: serviceId, company_type: companyType })
			.then(res => setProfile(res))
			.finally(() => {
				setLoading(false);
				setEditMode(false);
			});
	}, [companyId, serviceId, companyType]);

	async function onSubmit(values: FinanceProfileFormValues) {
		if (!canUpdateProfile) {
			window.$message?.warning("دسترسی ویرایش پروفایل شرکت ندارید.");
			return;
		}
		try {
			const payload = financeFormToPayload(values);

			if (!profile) {
				const created = await createFinanceProfile(payload);
				setProfile(created);
				setEditMode(false);
				window.$message?.success("اطلاعات مالی ایجاد شد");
				return;
			}

			const updated = await updateFinanceProfile(profile.id, payload);
			setProfile(updated);
			setEditMode(false);
			window.$message?.success("اطلاعات مالی ذخیره شد");
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

			<FinanceProfileForm
				key={profile?.id ?? "new"}
				disabled={!editMode}
				defaultValues={defaultValues}
				onSubmit={onSubmit}
			/>
		</div>
	);
}
