import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import { ProCard } from "@ant-design/pro-components";
import React from "react";
import { useWatch } from "react-hook-form";
import ShareholdersTable from "./ShareholdersTable";

export default function ShareholdersPanel() {
	const companyId = useWatch<CompanyProfileFormValues, "companyId">({ name: "companyId" });
	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" });

	if (!serviceId || !companyId) {
		return (
			<ProCard>
				<div className="opacity-80">ابتدا سرویس و سپس شرکت را انتخاب کنید.</div>
			</ProCard>
		);
	}

	return (
		<ProCard>
			<ShareholdersTable serviceId={serviceId} companyId={companyId} />
		</ProCard>
	);
}
