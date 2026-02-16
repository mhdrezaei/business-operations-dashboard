import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import type { CompanyProfileDto } from "../model/company-info.types";
import { Button, Spin } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { useWatch } from "react-hook-form";
import { createCompanyProfile, listCompanyProfiles, updateCompanyProfile } from "../../../api/company-profile.api";
import { companyInfoFormToPayload, dtoToCompanyInfoForm, emptyCompanyInfoValues } from "../model/company-info.mappers";
import CompanyInfoForm from "./CompanyInfoForm";

export default function CompanyInfoPanel({ companyId }: { companyId: number }) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" }) || 0;
	const [profile, setProfile] = useState<CompanyProfileDto | null>(null);

	const defaultValues = useMemo(() => {
		if (!profile)
			return emptyCompanyInfoValues;
		return dtoToCompanyInfoForm(profile, { serviceId, companyId });
	}, [profile]);

	useEffect(() => {
		listCompanyProfiles({ company: companyId, page: 1 })
			.then(res => setProfile(res.results?.[0] ?? null))
			.finally(() => {
				setLoading(false);
				setEditMode(false);
			});
	}, [companyId]);

	async function onSubmit(values: any) {
		setSaving(true);
		try {
			const payload = companyInfoFormToPayload(values);

			if (!profile) {
				const created = await createCompanyProfile({ ...payload, company: companyId, service: serviceId });
				setProfile(created);
				setEditMode(false);
				window.$message?.success("پروفایل شرکت با موفقیت ایجاد شد");
				return;
			}

			const updated = await updateCompanyProfile(profile.id, { ...payload, company: companyId, service: serviceId });
			setProfile(updated);
			setEditMode(false);
			window.$message?.success("تغییرات با موفقیت ذخیره شد");
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
					? (
						<Button type="primary" onClick={() => setEditMode(true)}>
							ویرایش پروفایل
						</Button>
					)
					: (
						<>
							<Button
								onClick={() => setEditMode(false)}
								disabled={saving}
							>
								انصراف
							</Button>

						</>
					)}
			</div>

			<CompanyInfoForm
				key={profile?.id ?? "new"} // برای reset درست هنگام تغییر company
				disabled={!editMode}
				defaultValues={defaultValues}
				onSubmit={onSubmit}
			/>
		</div>
	);
}
