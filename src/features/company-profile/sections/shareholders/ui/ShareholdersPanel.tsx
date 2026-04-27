import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import { Card } from "antd";
import React from "react";
import { useWatch } from "react-hook-form";
import ShareholdersTable from "./ShareholdersTable";

export default function ShareholdersPanel() {
	const companyId = useWatch<CompanyProfileFormValues, "companyId">({ name: "companyId" });
	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" });

	if (!serviceId || !companyId) {
		return (
			<Card>
				<div className="opacity-80">ابتدا سرویس و سپس شرکت را انتخاب کنید.</div>
			</Card>
		);
	}

	return (
		<Card>
			<ShareholdersTable serviceId={serviceId} companyId={companyId} />
		</Card>
	);
}
