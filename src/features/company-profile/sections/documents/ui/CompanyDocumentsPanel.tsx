import type { CompanyProfileFormValues } from "../../../model/company-profile.form.types";
import { ProCard } from "@ant-design/pro-components";
import React from "react";
import { useWatch } from "react-hook-form";
import CompanyDocumentsTable from "./CompanyDocumentsTable";

export default function CompanyDocumentsPanel() {
	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" });
	const companyId = useWatch<CompanyProfileFormValues, "companyId">({ name: "companyId" });

	if (!serviceId || !companyId) {
		return (
			<ProCard>
				<div style={{ opacity: 0.8 }}>ابتدا سرویس و سپس شرکت را انتخاب کنید.</div>
			</ProCard>
		);
	}

	return (
		<ProCard>
			<CompanyDocumentsTable serviceId={serviceId} companyId={companyId} />
		</ProCard>
	);
}
